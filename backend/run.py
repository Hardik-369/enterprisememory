import uvicorn
import os
import sys

# Ensure the backend directory is in the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

if __name__ == "__main__":
    print(f"Starting Company Brain API server on {settings.HOST}:{settings.PORT}...")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
