from __future__ import annotations

from app.services.restoration_service import RestorationService


class PipelineService:
    def __init__(self) -> None:
        self.restoration_service = RestorationService()

    def analyze_image(self, image, profile: str = "natural"):
        return self.restoration_service.analyze(image, profile=profile)

    def enhance_image(self, image, profile: str = "natural", mode: str = "hybrid"):
        return self.restoration_service.enhance(image, profile=profile, mode=mode)

    def compare_images(self, image, profile: str = "natural", mode: str = "hybrid"):
        return self.restoration_service.compare(image, profile=profile, mode=mode)
