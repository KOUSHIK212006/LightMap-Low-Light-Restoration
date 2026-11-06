from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health state.")
    version: str = Field(..., description="API version.")
    message: str = Field(..., description="Status description.")


class ImageAnalysisResponse(BaseModel):
    mean_brightness: float | None = None
    contrast_score: float | None = None
    noise_score: float | None = None
    highlight_clipping_ratio: float | None = None
    edge_score: float | None = None
    profile: str | None = None
    source: str | None = None


class EnhancementResponse(BaseModel):
    status: str
    message: str
    profile: str
    analysis: dict[str, Any] | None = None
    final_image: str | None = None
    classical_output: str | None = None
    deep_output: str | None = None
    hybrid_output: str | None = None
    quality_report: dict[str, Any] | None = None
    timing: dict[str, Any] | None = None
    warnings: list[str] = Field(default_factory=list)
    demo_mode: bool = False


class CompareResponse(BaseModel):
    message: str
    profile: str
    original_image: str | None = None
    final_image: str | None = None
    analysis: dict[str, Any] | None = None
    warnings: list[str] = Field(default_factory=list)
    timing: dict[str, Any] | None = None
