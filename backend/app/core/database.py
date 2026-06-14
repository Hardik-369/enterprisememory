from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import logging
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("companybrain.database")

Base = declarative_base()
engine = None

# Establish DB connection with fallback
try:
    if settings.DATABASE_URL.startswith("postgresql"):
        logger.info(f"Attempting to connect to PostgreSQL at {settings.DATABASE_URL}...")
        # create_engine for PostgreSQL. We use a 3-second timeout for rapid failover response.
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3}
        )
        # Test connection
        with engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database.")
    else:
        logger.info("DATABASE_URL is not configured for PostgreSQL. Switching to SQLite.")
        raise ValueError("No PostgreSQL URL")
except Exception as e:
    logger.warning(f"PostgreSQL connection failed: {e}. Falling back to local SQLite database.")
    # Initialize SQLite database
    sqlite_url = settings.SQLITE_FALLBACK_URL
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False} if sqlite_url.startswith("sqlite") else {}
    )
    logger.info(f"Successfully initialized SQLite database at {sqlite_url}.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
