import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.models import User, Document, TimelineEntry
from app.api import auth, documents, search, timeline, graph
from app.services.graphiti_service import add_episode
from datetime import datetime, timezone, timedelta

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("companybrain.main")

# Create SQL Tables (PostgreSQL or SQLite fallback)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas verified/created successfully.")
except Exception as e:
    logger.error(f"Failed to create database schemas: {e}")

# Seed default data helper
def seed_database():
    db = SessionLocal()
    try:
        # 1. Seed default accounts if empty
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("No users found. Seeding default accounts (admin, manager, employee)...")
            
            users = [
                User(username="admin", hashed_password=get_password_hash("admin123"), role="admin"),
                User(username="manager", hashed_password=get_password_hash("manager123"), role="manager"),
                User(username="employee", hashed_password=get_password_hash("employee123"), role="employee"),
            ]
            db.add_all(users)
            db.commit()
            logger.info("Successfully seeded default accounts.")
            
        # 2. Seed initial timeline log if empty
        timeline_count = db.query(TimelineEntry).count()
        if timeline_count == 0:
            logger.info("Seeding initial company history timeline log...")
            initial_event = TimelineEntry(
                event_type="milestone",
                description="Company Brain shared memory and retrieval platform was successfully launched.",
                reference_time=datetime.now(timezone.utc) - timedelta(days=2),
                document_id=None
            )
            incident_event = TimelineEntry(
                event_type="incident",
                description="[Incident] Production database transactions locked, causing a 12-minute outage.",
                reference_time=datetime.now(timezone.utc) - timedelta(days=5),
                document_id=None
            )
            decision_event = TimelineEntry(
                event_type="decision",
                description="Architectural decision made to migrate document knowledge base to Graphiti context graphs.",
                reference_time=datetime.now(timezone.utc) - timedelta(days=8),
                document_id=None
            )
            db.add_all([initial_event, incident_event, decision_event])
            db.commit()
            logger.info("Successfully seeded timeline history.")
            
        # 3. Rebuild knowledge graph from stored documents (survives restarts)
        stored_docs = db.query(Document).filter(Document.status == "indexed").all()
        if stored_docs:
            logger.info(f"Rebuilding knowledge graph from {len(stored_docs)} stored documents...")
            from app.services.graphiti_service import extract_entities_from_text, LOCAL_GRAPH_NODES, LOCAL_GRAPH_EDGES
            LOCAL_GRAPH_NODES.clear()
            LOCAL_GRAPH_EDGES.clear()
            for doc in stored_docs:
                try:
                    content = ""
                    if os.path.exists(doc.file_path):
                        ext = doc.file_path.rsplit(".", 1)[-1].lower()
                        if ext == "pdf":
                            import pypdf
                            reader = pypdf.PdfReader(doc.file_path)
                            content = "\n".join(p.extract_text() or "" for p in reader.pages)
                        else:
                            with open(doc.file_path, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                    if content.strip():
                        extract_entities_from_text(content, doc.filename)
                except Exception as e:
                    logger.warning(f"Could not rebuild graph for '{doc.filename}': {e}")

    except Exception as e:
        logger.error(f"Database seed failed: {e}")
    finally:
        db.close()

# Run seed
seed_database()

# Instantiate FastAPI
app = FastAPI(
    title="Company Brain API",
    description="Shared memory, knowledge network, and retrieval context pipeline for the enterprise.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend origin e.g. http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API routers
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(timeline.router, prefix="/api")
app.include_router(graph.router, prefix="/api")

@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "Company Brain shared context server",
        "version": "1.0.0"
    }
