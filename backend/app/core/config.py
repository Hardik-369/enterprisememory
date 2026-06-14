import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # JWT Settings
    SECRET_KEY: str = "companybrain_super_secret_session_key_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Relational Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/companybrain"
    SQLITE_FALLBACK_URL: str = "sqlite:///./data/companybrain.db"

    # Vector Database (ChromaDB)
    CHROMA_PERSIST_DIRECTORY: str = "./data/chroma"

    # Graph Database (Neo4j / Graphiti)
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # LLM Settings (NVIDIA NIM API)
    NVIDIA_API_KEY: str = "mock-nvidia-api-key-for-local-testing"
    NVIDIA_NIM_MODEL: str = "meta/llama3-70b-instruct"

    # Local Ollama Support
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # Uploads storage directory
    UPLOAD_DIR: str = "./data/documents"

    # Environment settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Configuration for loading from .env
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Make sure directory structures exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(settings.SQLITE_FALLBACK_URL.replace("sqlite:///", "")), exist_ok=True)
