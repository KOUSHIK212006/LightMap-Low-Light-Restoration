from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.pipeline import PipelineService

router = APIRouter(prefix="/api/v1")


@router.post("/analyze")
async def analyze_image(
    image: Annotated[UploadFile, File(...)],
    profile: Annotated[str, Form()] = "natural",
):
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="An image file is required for analysis.")

    pipeline = PipelineService()
    image_array = await _read_image(image)
    return pipeline.analyze_image(image_array, profile=profile)


@router.post("/enhance")
async def enhance_image(
    image: Annotated[UploadFile, File(...)],
    profile: Annotated[str, Form()] = "natural",
):
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="An image file is required for enhancement.")

    pipeline = PipelineService()
    image_array = await _read_image(image)
    return pipeline.enhance_image(image_array, profile=profile)


@router.post("/compare")
async def compare_images(
    image: Annotated[UploadFile, File(...)],
    profile: Annotated[str, Form()] = "natural",
):
    if not image or not image.filename:
        raise HTTPException(status_code=400, detail="An image file is required for comparison.")

    pipeline = PipelineService()
    image_array = await _read_image(image)
    return pipeline.compare_images(image_array, profile=profile)


async def _read_image(file: UploadFile):
    from app.utils.validation import validate_and_decode_image

    image_array = validate_and_decode_image(file)
    return image_array
