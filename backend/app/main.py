from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="LightMap API for explainable low-light restoration workflows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def read_root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "message": "LightMap backend is running.",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": settings.app_version,
        "message": "LightMap backend is healthy.",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("LIGHTMAP_DEBUG", "false").lower() == "true",
    )
