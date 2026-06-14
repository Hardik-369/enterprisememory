import os
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from neo4j import GraphDatabase
from app.core.config import settings

logger = logging.getLogger("companybrain.graphiti")

# Graphiti internally checks os.environ for OPENAI_API_KEY
# Export the NVIDIA key under that name so Graphiti can use it with our custom base URL
if settings.NVIDIA_API_KEY and not settings.NVIDIA_API_KEY.startswith("mock"):
    os.environ.setdefault("OPENAI_API_KEY", settings.NVIDIA_API_KEY)
    os.environ.setdefault("OPENAI_BASE_URL", "https://integrate.api.nvidia.com/v1")

# Safe imports for graphiti-core
try:
    from graphiti_core import Graphiti
    from graphiti_core.llm_client.config import LLMConfig
    from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
    from graphiti_core.nodes import EpisodeType
    GRAPHITI_AVAILABLE = True
except ImportError:
    GRAPHITI_AVAILABLE = False
    logger.warning("graphiti-core packages could not be imported.")

graphiti_client = None
neo4j_driver = None
is_graphiti_active = False

# Try to initialize Graphiti and Neo4j driver
if GRAPHITI_AVAILABLE:
    try:
        llm_client = None
        api_key = settings.NVIDIA_API_KEY
        if not api_key or api_key.startswith("mock"):
            api_key = os.environ.get("OPENAI_API_KEY", "")
        if api_key:
            logger.info("Configuring Graphiti with NVIDIA NIM LLM for extraction")
            llm_config = LLMConfig(
                api_key=api_key,
                model=settings.NVIDIA_NIM_MODEL,
                base_url="https://integrate.api.nvidia.com/v1"
            )
            llm_client = OpenAIGenericClient(config=llm_config)

        logger.info(f"Connecting to Neo4j at {settings.NEO4J_URI}...")
        neo4j_driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
        neo4j_driver.verify_connectivity()

        graphiti_client = Graphiti(
            uri=settings.NEO4J_URI,
            user=settings.NEO4J_USER,
            password=settings.NEO4J_PASSWORD,
            llm_client=llm_client
        )

        is_graphiti_active = True
        logger.info("Successfully connected to Neo4j and initialized Graphiti client.")
    except Exception as e:
        logger.warning(f"Failed to initialize Neo4j/Graphiti: {e}. Using local entity extraction.")
        is_graphiti_active = False
        if neo4j_driver:
            try:
                neo4j_driver.close()
            except:
                pass
            neo4j_driver = None
else:
    is_graphiti_active = False

# In-memory graph storage for local entity extraction when Neo4j is unavailable
LOCAL_GRAPH_NODES: List[Dict[str, Any]] = []
LOCAL_GRAPH_EDGES: List[Dict[str, Any]] = []
_graph_node_counter = 0

UPPER_WORDS_RE = re.compile(r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b')

def extract_entities_from_text(content: str, filename: str):
    """Extract entities from text and add to local graph storage."""
    global _graph_node_counter
    preview = content[:200].replace("\n", " ")
    doc_node_id = f"doc_{_graph_node_counter}"
    _graph_node_counter += 1
    LOCAL_GRAPH_NODES.append({
        "id": doc_node_id,
        "label": "Document",
        "name": filename,
        "summary": f"Uploaded document: {preview}..."
    })
    candidates = set()
    for match in UPPER_WORDS_RE.finditer(content):
        word = match.group().strip()
        if 3 <= len(word) <= 40 and not word.endswith(".") and word != filename.replace(".pdf", ""):
            candidates.add(word)
    entity_ids = []
    for i, entity_name in enumerate(list(candidates)[:5]):
        entity_id = f"ent_{_graph_node_counter}"
        _graph_node_counter += 1
        entity_ids.append(entity_id)
        LOCAL_GRAPH_NODES.append({
            "id": entity_id,
            "label": "Entity",
            "name": entity_name,
            "summary": f"Entity extracted from '{filename}': {entity_name}"
        })
        LOCAL_GRAPH_EDGES.append({
            "source": doc_node_id,
            "target": entity_id,
            "label": "MENTIONS",
            "relation": f"document mentions {entity_name}"
        })
    return entity_ids

async def build_indices():
    """Build indices and constraints in Neo4j."""
    if is_graphiti_active and graphiti_client:
        try:
            await graphiti_client.build_indices_and_constraints()
            logger.info("Graphiti indices and constraints built successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to build Graphiti indices: {e}")
    return False

async def add_episode(document_id: str, filename: str, content: str, reference_time: datetime = None) -> bool:
    """
    Ingests a document as an 'episode' into Graphiti, extracting entities and relationships.
    Falls back to local entity extraction if Neo4j/Graphiti is unavailable.
    """
    if not is_graphiti_active or not graphiti_client:
        logger.info(f"Extracting entities from '{filename}' ({document_id}) locally (Neo4j/Graphiti unavailable)")
        entity_ids = extract_entities_from_text(content, filename)
        logger.info(f"Extracted {len(entity_ids)} entities from '{filename}'.")
        return True

    if reference_time is None:
        reference_time = datetime.now(timezone.utc)

    try:
        await graphiti_client.add_episode(
            name=filename,
            episode_body=content,
            source=EpisodeType.text,
            source_description=f"Uploaded file: {filename}",
            reference_time=reference_time
        )
        logger.info(f"Successfully added episode '{filename}' to Neo4j knowledge graph.")
        return True
    except Exception as e:
        logger.error(f"Failed to add episode to Graphiti: {e}. Falling back to local extraction.")
        entity_ids = extract_entities_from_text(content, filename)
        logger.info(f"Extracted {len(entity_ids)} entities locally from '{filename}' as fallback.")
        return True

async def search_graph(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Searches the knowledge graph via Graphiti, or local entity index if unavailable.
    """
    if not is_graphiti_active or not graphiti_client:
        q = query.lower()
        results = []
        for node in LOCAL_GRAPH_NODES:
            if q in node["name"].lower() or q in node.get("summary", "").lower():
                results.append({
                    "type": "entity",
                    "name": node["name"],
                    "label": node["label"],
                    "summary": node.get("summary", ""),
                    "score": 0.85
                })
        for edge in LOCAL_GRAPH_EDGES:
            if q in edge["relation"].lower() or q in edge["label"].lower():
                results.append({
                    "type": "relationship",
                    "source": edge["source"],
                    "target": edge["target"],
                    "relation": edge["relation"],
                    "score": 0.80
                })
        return results[:limit]

    try:
        search_results = await graphiti_client.search(
            query=query,
            num_results=limit
        )
        results = []
        for result in search_results:
            results.append({
                "type": "graph_result",
                "content": str(result),
                "score": 0.90
            })
        return results
    except Exception as e:
        logger.error(f"Graphiti search failed: {e}")
        return []

def get_graph_visualization_data() -> Dict[str, List[Dict[str, Any]]]:
    """
    Returns all nodes and relationships for the frontend graph viewer.
    Merges Neo4j data (if available) with locally extracted entities.
    """
    nodes = list(LOCAL_GRAPH_NODES)
    edges = list(LOCAL_GRAPH_EDGES)
    node_ids = set(n["id"] for n in nodes)

    if is_graphiti_active and neo4j_driver:
        try:
            query = """
            MATCH (n)
            OPTIONAL MATCH (n)-[r]->(m)
            RETURN n, r, m LIMIT 200
            """

            with neo4j_driver.session() as session:
                result = session.run(query)
                for record in result:
                    n = record["n"]
                    r = record["r"]
                    m = record["m"]

                    if n and n.element_id not in node_ids:
                        node_ids.add(n.element_id)
                        labels = list(n.labels)
                        label = labels[0] if labels else "Entity"
                        nodes.append({
                            "id": n.element_id,
                            "label": label,
                            "name": n.get("name", n.get("title", f"Node {n.element_id[:8]}")),
                            "summary": n.get("summary", n.get("description", ""))
                        })

                    if m and m.element_id not in node_ids:
                        node_ids.add(m.element_id)
                        labels = list(m.labels)
                        label = labels[0] if labels else "Entity"
                        nodes.append({
                            "id": m.element_id,
                            "label": label,
                            "name": m.get("name", m.get("title", f"Node {m.element_id[:8]}")),
                            "summary": m.get("summary", m.get("description", ""))
                        })

                    if r:
                        edges.append({
                            "source": n.element_id,
                            "target": m.element_id,
                            "label": r.type,
                            "relation": r.get("relation", r.type)
                        })

        except Exception as e:
            logger.error(f"Failed to fetch Neo4j graph viz data: {e}. Returning local data only.")

    return {"nodes": nodes, "edges": edges}
