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
    selected_method: str | None = None
    processing_status: str | None = None
    analysis: dict[str, Any] | None = None
    final_image: str | None = None
    classical_output: str | None = None
    deep_output: str | None = None
    hybrid_output: str | None = None
    classical_image: str | None = None
    deep_image: str | None = None
    hybrid_image: str | None = None
    fusion_map: str | None = None
    disagreement_map: str | None = None
    change_map: str | None = None
    change_stats: dict[str, Any] | None = None
    histograms: dict[str, Any] | None = None
    grid_stats: list[dict[str, Any]] | None = None
    method_metrics: dict[str, Any] | None = None
    classical_stages: list[dict[str, Any]] | None = None
    quality_report: dict[str, Any] | None = None
    timing: dict[str, Any] | None = None
    timings: dict[str, Any] | None = None
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
