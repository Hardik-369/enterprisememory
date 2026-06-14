from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.schemas.schemas import GraphDataResponse
from app.services.graphiti_service import get_graph_visualization_data

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])

@router.get("", response_model=GraphDataResponse)
def get_graph_viz(
    current_user: dict = Depends(get_current_user)
):
    """
    Fetch all nodes and relationships to render in the interactive frontend graph viewer.
    Returns the real Neo4j nodes/edges, or falls back to a predefined set of mock nodes/edges
    if the Neo4j server is down, allowing immediate UI demonstration.
    """
    return get_graph_visualization_data()
