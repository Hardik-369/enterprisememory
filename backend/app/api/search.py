from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import SearchQuery
from app.services.search_service import execute_hybrid_query

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("")
async def hybrid_search(
    search_in: SearchQuery,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Executes a hybrid search query across ChromaDB (Semantic), Neo4j (Graph), and PostgreSQL (Timeline)
    and generates an answer via NVIDIA NIM.
    """
    if not search_in.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
        
    try:
        results = await execute_hybrid_query(
            query=search_in.query,
            db=db,
            sources=search_in.sources
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search pipeline execution failed: {str(e)}")
