from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import TimelineEntry
from app.schemas.schemas import TimelineEntryResponse, TimelineEntryCreate

router = APIRouter(prefix="/timeline", tags=["Timeline"])

@router.get("/", response_model=List[TimelineEntryResponse])
def get_timeline(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve all chronological logs and events.
    Returned in reverse chronological order.
    """
    return db.query(TimelineEntry).order_by(TimelineEntry.reference_time.desc()).all()

@router.post("/", response_model=TimelineEntryResponse, status_code=status.HTTP_201_CREATED)
def create_timeline_event(
    event_in: TimelineEntryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "manager"]))
):
    """
    Manually log an event, incident, decision or milestone.
    Restricted to Admins and Managers.
    """
    db_entry = TimelineEntry(
        event_type=event_in.event_type,
        description=event_in.description,
        reference_time=event_in.reference_time,
        document_id=event_in.document_id
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry
