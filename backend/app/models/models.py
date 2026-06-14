from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="employee", nullable=False) # admin, manager, employee
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    documents = relationship("Document", back_populates="uploader")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # pdf, md, txt, meeting_note, etc.
    file_size = Column(Integer, nullable=False)
    status = Column(String, default="pending") # pending, processing, indexed, failed
    error_message = Column(Text, nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    uploader = relationship("User", back_populates="documents")
    timeline_entries = relationship("TimelineEntry", back_populates="document", cascade="all, delete-orphan")

class TimelineEntry(Base):
    __tablename__ = "timeline_entries"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False) # upload, decision, milestone, incident, meeting
    description = Column(Text, nullable=False)
    reference_time = Column(DateTime, nullable=False, index=True) # Actual event timestamp
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    document = relationship("Document", back_populates="timeline_entries")
