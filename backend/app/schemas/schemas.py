from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any

# Authentication
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    role: str = Field("employee", description="Can be 'admin', 'manager', or 'employee'")

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Documents
class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Timeline
class TimelineEntryCreate(BaseModel):
    event_type: str
    description: str
    reference_time: datetime
    document_id: Optional[str] = None

class TimelineEntryResponse(BaseModel):
    id: int
    event_type: str
    description: str
    reference_time: datetime
    document_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Search Query
class SearchQuery(BaseModel):
    query: str
    sources: Optional[List[str]] = Field(default=None, description="List of retrieval filters: 'semantic', 'graph', 'timeline'")

# Graph Vis Responses
class GraphNode(BaseModel):
    id: str
    label: str
    name: str
    summary: Optional[str] = ""

class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    relation: str

class GraphDataResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
