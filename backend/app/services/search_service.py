import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import TimelineEntry, Document
from app.services.chroma_service import search_chunks
from app.services.graphiti_service import search_graph
from app.services.nim_service import nim_client

logger = logging.getLogger("companybrain.search")

def filter_stop_words(query: str) -> List[str]:
    """Helper to split a query into search terms, filtering out common stop words."""
    stop_words = {
        "what", "who", "why", "how", "when", "where", "which", "is", "are", "was",
        "were", "have", "had", "has", "do", "does", "did", "the", "a", "an", "and",
        "or", "but", "in", "on", "at", "to", "for", "with", "by", "about", "this", "that"
    }
    words = [w.strip("?,.!-").lower() for w in query.split() if w.strip()]
    return [w for w in words if w not in stop_words and len(w) > 1]

async def search_timeline(query: str, db: Session, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Searches timeline logs in the relational database using keyword matching.
    Falls back to returning the most recent events to maintain temporal context.
    """
    search_terms = filter_stop_words(query)
    results = []
    
    if search_terms:
        # Build query matching any term in the description or event_type
        # Using a list comprehension to build OR conditions
        from sqlalchemy import or_
        conditions = []
        for term in search_terms:
            conditions.append(TimelineEntry.description.ilike(f"%{term}%"))
            conditions.append(TimelineEntry.event_type.ilike(f"%{term}%"))
            
        results = db.query(TimelineEntry).filter(or_(*conditions))\
            .order_by(TimelineEntry.reference_time.desc())\
            .limit(limit).all()
            
    # If no results matched, fall back to the most recent timeline entries for context
    if not results:
        results = db.query(TimelineEntry)\
            .order_by(TimelineEntry.reference_time.desc())\
            .limit(limit).all()
            
    formatted = []
    for entry in results:
        doc_name = "System Log"
        if entry.document:
            doc_name = entry.document.filename
            
        formatted.append({
            "id": entry.id,
            "event_type": entry.event_type,
            "description": entry.description,
            "reference_time": entry.reference_time.isoformat(),
            "source_document": doc_name
        })
        
    return formatted

async def execute_hybrid_query(
    query: str, 
    db: Session, 
    sources: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Core retrieval pipeline:
    1. Retrieve semantic chunks from ChromaDB.
    2. Retrieve entity and relationship facts from Neo4j/Graphiti.
    3. Retrieve chronological timeline entries from SQL.
    4. Fuse context and synthesize response using NVIDIA NIM API.
    """
    if not sources:
        sources = ["semantic", "graph", "timeline"]
        
    context_blocks = []
    retrieved_semantic = []
    retrieved_graph = []
    retrieved_timeline = []
    
    # 1. Semantic Vector Search
    if "semantic" in sources:
        try:
            chunks = search_chunks(query, limit=5)
            retrieved_semantic = chunks
            for chunk in chunks:
                doc_name = chunk["metadata"].get("filename", "Unknown Document")
                text = chunk["text"]
                context_blocks.append(f"- [Semantic] From doc '{doc_name}': {text}")
        except Exception as e:
            logger.error(f"Semantic pipeline search failed: {e}")
            
    # 2. Knowledge Graph Search
    if "graph" in sources:
        try:
            graph_facts = await search_graph(query, limit=5)
            retrieved_graph = graph_facts
            for fact in graph_facts:
                if fact.get("type") == "entity":
                    context_blocks.append(
                        f"- [Graph] Named Entity: '{fact['name']}' ({fact['label']}) - {fact['summary']}"
                    )
                elif fact.get("type") == "relationship":
                    context_blocks.append(
                        f"- [Graph] Connection: {fact['relation']}"
                    )
                elif fact.get("type") == "graph_result":
                    context_blocks.append(
                        f"- [Graph] Core Connection: {fact['content']}"
                    )
        except Exception as e:
            logger.error(f"Graph pipeline search failed: {e}")
            
    # 3. Timeline Event Search
    if "timeline" in sources:
        try:
            events = await search_timeline(query, db, limit=5)
            retrieved_timeline = events
            for event in events:
                ref_time = event["reference_time"][:10]  # Just YYYY-MM-DD
                desc = event["description"]
                context_blocks.append(
                    f"- [Timeline] Event occurred on {ref_time}: {desc} (ref: {event['source_document']})"
                )
        except Exception as e:
            logger.error(f"Timeline pipeline search failed: {e}")
            
    # 4. Synthesize context
    fused_context = "\n".join(context_blocks) if context_blocks else "No relevant context found."
    
    # 5. Generate Answer via NVIDIA NIM
    logger.info("Synthesizing final answer with NIM LLM")
    answer = nim_client.generate_answer(query, fused_context)
    
    return {
        "query": query,
        "answer": answer,
        "context_used": fused_context,
        "sources": {
            "semantic": retrieved_semantic,
            "graph": retrieved_graph,
            "timeline": retrieved_timeline
        }
    }
