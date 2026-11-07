from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    app_name: str = "LightMap"
    app_version: str = "0.1.0"
    debug: bool = False
    allowed_origins: list[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]
    )
    max_upload_size_mb: int = 10
    max_image_width: int = 4096
    max_image_height: int = 4096
    allowed_extensions: tuple[str, ...] = (".jpg", ".jpeg", ".png")
    deep_checkpoint_path: str | None = None

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


def _build_allowed_origins() -> list[str]:
    raw_origins = os.getenv(
        "LIGHTMAP_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    frontend_origin = os.getenv("LIGHTMAP_FRONTEND_ORIGIN", "").strip()
    if frontend_origin and frontend_origin not in origins:
        origins.append(frontend_origin)
    return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]


def get_settings() -> Settings:
    return Settings(
        debug=os.getenv("LIGHTMAP_DEBUG", "false").lower() == "true",
        max_upload_size_mb=int(os.getenv("LIGHTMAP_MAX_UPLOAD_SIZE_MB", "10")),
        max_image_width=int(os.getenv("LIGHTMAP_MAX_IMAGE_WIDTH", "4096")),
        max_image_height=int(os.getenv("LIGHTMAP_MAX_IMAGE_HEIGHT", "4096")),
        allowed_origins=_build_allowed_origins(),
        deep_checkpoint_path=os.getenv("LIGHTMAP_DEEP_CHECKPOINT_PATH") or None,
    )
