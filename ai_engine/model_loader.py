from __future__ import annotations

from .inference import get_weights_path, is_model_available


def load_model(model_name: str = "retinexformer"):
    """Load model wrapper checking model availability."""
    available, reason = is_model_available()
    if not available:
        raise FileNotFoundError(f"Model '{model_name}' cannot be loaded: {reason}")
    from .inference import _load_model
    return _load_model()


__all__ = ["load_model", "is_model_available", "get_weights_path"]
