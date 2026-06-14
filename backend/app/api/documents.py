import os
import re
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
import pypdf

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, require_roles
from app.models.models import Document, TimelineEntry, User
from app.schemas.schemas import DocumentResponse
from app.services.chroma_service import add_document_chunks, delete_document_chunks
from app.services.graphiti_service import add_episode

logger = logging.getLogger("companybrain.documents")
router = APIRouter(prefix="/documents", tags=["Documents"])

# Date parsing regex for automatic timeline logging (YYYY-MM-DD and Month DD, YYYY)
DATE_REGEX = re.compile(
    r'\b((?:19|20)\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b|' # YYYY-MM-DD
    r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+((?:19|20)\d{2})\b',
    re.IGNORECASE
)

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a PDF file using pypdf."""
    text = ""
    try:
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"Error reading PDF {file_path}: {e}")
        raise ValueError(f"Could not extract text from PDF: {str(e)}")
    return text

def parse_temporal_events(text: str) -> List[tuple]:
    """
    Scans the text for date mentions and surrounding context.
    Returns a list of tuples: (parsed_datetime, event_description).
    """
    events = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if len(line) < 15: # Skip very short lines
            continue
            
        match = DATE_REGEX.search(line)
        if match:
            try:
                dt = None
                # Check YYYY-MM-DD format
                if match.group(1):
                    year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                    dt = datetime(year, month, day, tzinfo=timezone.utc)
                # Check Month DD, YYYY format
                elif match.group(4):
                    months = {"jan":1, "feb":2, "mar":3, "apr":4, "may":5, "jun":6, "jul":7, "aug":8, "sep":9, "oct":10, "nov":11, "dec":12}
                    m_name = match.group(4).lower()[:3]
                    month = months.get(m_name, 1)
                    day = int(match.group(5))
                    year = int(match.group(6))
                    dt = datetime(year, month, day, tzinfo=timezone.utc)
                
                if dt:
                    # Clear date pattern from sentence to make a cleaner description
                    desc = DATE_REGEX.sub("", line).strip()
                    desc = re.sub(r'\s+', ' ', desc) # Remove double spacing
                    # Fallback description if empty
                    if not desc or len(desc) < 5:
                        desc = f"Key reference found in document: {line[:50]}..."
                    events.append((dt, desc))
            except Exception as e:
                logger.debug(f"Failed to parse matching date pattern: {e}")
                
    return events[:5] # Limit automatic events to top 5 per doc to prevent spam

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "manager"]))
):
    """Upload and process a document. Restricted to Admin and Manager roles."""
    filename = file.filename
    file_type = filename.split(".")[-1].lower() if "." in filename else "txt"
    
    if file_type not in ["pdf", "md", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF, Markdown (md), and Text (txt) are supported."
        )
        
    # Save the file to disk
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    doc_id = str(datetime.now().timestamp()).replace(".", "")
    save_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, save_filename)
    
    # Track file size
    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024): # 1MB chunks
            file_size += len(chunk)
            buffer.write(chunk)
            
    # 1. Create document entry in database (relational)
    db_doc = Document(
        id=doc_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        status="processing",
        uploaded_by_id=current_user["id"]
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # Process asynchronously / in-line for simple setup
    extracted_text = ""
    try:
        if file_type == "pdf":
            extracted_text = extract_text_from_pdf(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                extracted_text = f.read()
                
        if not extracted_text.strip():
            raise ValueError("No text could be extracted from the document.")

        # 2. Store embeddings in ChromaDB
        chroma_ok = add_document_chunks(doc_id, filename, file_type, extracted_text)
        
        # 3. Add to Graphiti / Neo4j Knowledge Graph
        graph_ok = await add_episode(doc_id, filename, extracted_text)
        
        # 4. Create primary upload Timeline entry
        upload_event = TimelineEntry(
            event_type="document_uploaded",
            description=f"Document '{filename}' uploaded by {current_user['username']}.",
            reference_time=datetime.now(timezone.utc),
            document_id=doc_id
        )
        db.add(upload_event)
        
        # 5. Extract additional temporal events from text and log to Timeline
        extracted_events = parse_temporal_events(extracted_text)
        for dt, desc in extracted_events:
            event = TimelineEntry(
                event_type="extracted_reference",
                description=f"[Auto-Extracted] {desc}",
                reference_time=dt,
                document_id=doc_id
            )
            db.add(event)
            
        if chroma_ok or graph_ok:
            db_doc.status = "indexed"
        else:
            db_doc.status = "failed"
            db_doc.error_message = "Indexing failed in databases."
            
    except Exception as e:
        logger.error(f"Processing document failed: {e}")
        db_doc.status = "failed"
        db_doc.error_message = str(e)
        
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all indexed documents. Available to all authenticated employees."""
    return db.query(Document).order_by(Document.created_at.desc()).all()

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "manager"]))
):
    """Deletes an indexed document from relational database, ChromaDB, and local disk. Restricted to Admin and Manager."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete file from local disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.error(f"Failed to remove file from disk: {e}")
            
    # Delete from ChromaDB
    delete_document_chunks(document_id)
    
    # Note: Graphiti does not support direct cascade delete of episode nodes easily,
    # but we deleted the primary relational mappings and vector indices.
    
    # Delete from SQLite/PostgreSQL
    db.delete(doc)
    db.commit()
    return {"message": "Document successfully deleted."}
