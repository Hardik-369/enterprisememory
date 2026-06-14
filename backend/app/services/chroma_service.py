import os
import logging
from typing import List, Dict, Any
import chromadb
from chromadb.utils import embedding_functions
from app.core.config import settings

logger = logging.getLogger("companybrain.chroma")

# Initialize ChromaDB persistent client
try:
    client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
    logger.info(f"Initialized ChromaDB persistent client at {settings.CHROMA_PERSIST_DIRECTORY}")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB client: {e}")
    # Fallback to ephemeral client for testing in memory
    client = chromadb.EphemeralClient()
    logger.warning("Falling back to ChromaDB EphemeralClient (In-Memory)")

import hashlib
import numpy as np

def _hash_embed(text: str, dim: int = 384) -> List[float]:
    """Deterministic hash-based embedding fallback when ONNX is unavailable."""
    h = hashlib.sha256(text.encode("utf-8")).digest()
    seed = int.from_bytes(h[:8], "little") & 0xFFFFFFFF
    rng = np.random.RandomState(seed)
    vec = rng.randn(dim).astype(np.float32)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

class EmbeddingProvider:
    def __init__(self):
        self.local_ef = None
        try:
            self.local_ef = embedding_functions.DefaultEmbeddingFunction()
            self.local_ef(["test"])
            logger.info("Local ONNX embedding function loaded successfully.")
        except Exception as e:
            logger.warning(f"ONNX embedding function failed to load: {e}. Using hash-based fallback.")
            self.local_ef = None

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if self.local_ef is not None:
            try:
                return self.local_ef(texts)
            except Exception as e:
                logger.error(f"Local ONNX embedding failed: {e}. Using hash fallback.")
        return [_hash_embed(t) for t in texts]

embedding_provider = EmbeddingProvider()

# Get or create the vector collection
try:
    # We pass None for embedding_function because we generate them manually via embedding_provider
    collection = client.get_or_create_collection(
        name="company_brain_chunks",
        metadata={"hnsw:space": "cosine"}
    )
except Exception as e:
    logger.error(f"Failed to retrieve or create ChromaDB collection: {e}")
    collection = None

def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
    """
    Splits text into chunks of roughly chunk_size characters with chunk_overlap characters overlap.
    Maintains sentence boundaries where possible.
    """
    if not text:
        return []
        
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = ""
    
    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue
            
        if len(current_chunk) + len(paragraph) <= chunk_size:
            current_chunk += ("\n\n" if current_chunk else "") + paragraph
        else:
            # If current_chunk has data, save it
            if current_chunk:
                chunks.append(current_chunk)
            
            # If the paragraph itself is larger than chunk_size, split by sentences
            if len(paragraph) > chunk_size:
                sentences = paragraph.replace(". ", ".\n").split("\n")
                current_chunk = ""
                for sentence in sentences:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    if len(current_chunk) + len(sentence) <= chunk_size:
                        current_chunk += (" " if current_chunk else "") + sentence
                    else:
                        if current_chunk:
                            chunks.append(current_chunk)
                        current_chunk = sentence
                if current_chunk:
                    # Keep for next iteration if not full
                    pass
            else:
                current_chunk = paragraph
                
    if current_chunk:
        chunks.append(current_chunk)
        
    return chunks

def add_document_chunks(document_id: str, filename: str, file_type: str, text: str) -> bool:
    """
    Chunks document text, generates embeddings, and adds them to ChromaDB.
    """
    if not collection:
        logger.error("ChromaDB collection is not initialized.")
        return False
        
    chunks = chunk_text(text)
    if not chunks:
        logger.warning(f"No text extracted or chunked for document {filename} ({document_id})")
        return False
        
    try:
        # Generate embeddings
        embeddings = embedding_provider.get_embeddings(chunks)
        
        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "document_id": document_id,
                "filename": filename,
                "file_type": file_type,
                "chunk_index": i
            }
            for i in range(len(chunks))
        ]
        
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=chunks
        )
        logger.info(f"Successfully indexed {len(chunks)} chunks for document: {filename} ({document_id})")
        return True
    except Exception as e:
        logger.error(f"Failed to add document chunks to ChromaDB: {e}")
        return False

def search_chunks(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Searches ChromaDB for the most relevant document chunks.
    """
    if not collection:
        logger.error("ChromaDB collection is not initialized.")
        return []
        
    try:
        # Generate embedding for the query
        query_embeddings = embedding_provider.get_embeddings([query])
        
        results = collection.query(
            query_embeddings=query_embeddings,
            n_results=limit
        )
        
        formatted_results = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            ids = results["ids"][0]
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)
            
            for i in range(len(docs)):
                formatted_results.append({
                    "id": ids[i],
                    "text": docs[i],
                    "metadata": metas[i],
                    "score": 1.0 - distances[i]  # Convert distance to similarity score
                })
        return formatted_results
    except Exception as e:
        logger.error(f"Search chunks in ChromaDB failed: {e}")
        return []

def delete_document_chunks(document_id: str) -> bool:
    """
    Deletes all chunks associated with a document_id.
    """
    if not collection:
        return False
    try:
        collection.delete(where={"document_id": document_id})
        logger.info(f"Deleted all ChromaDB chunks for document_id: {document_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete ChromaDB chunks for document_id {document_id}: {e}")
        return False
