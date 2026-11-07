#!/usr/bin/env python3
"""Dataset validation script for LightMap Low-Light Restoration.

Checks paired image dimensions, formats, and channel consistency.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
import cv2
import numpy as np

def validate_paired_dataset(data_dir: Path) -> dict:
    low_dir = data_dir / "low"
    gt_dir = data_dir / "gt"

    if not low_dir.exists() or not gt_dir.exists():
        return {"status": "error", "message": f"Missing low or gt directory in {data_dir}"}

    low_files = sorted(f for f in low_dir.glob("*.png"))
    gt_files = sorted(f for f in gt_dir.glob("*.png"))

    if not low_files:
        return {"status": "error", "message": "No low-light images found."}

    matched_pairs = []
    issues = []

    for low_p in low_files:
        gt_p = gt_dir / low_p.name
        if not gt_p.exists():
            issues.append(f"Missing GT reference for {low_p.name}")
            continue

        low_img = cv2.imread(str(low_p))
        gt_img = cv2.imread(str(gt_p))

        if low_img is None or gt_img is None:
            issues.append(f"Corrupt image file in pair {low_p.name}")
            continue

        if low_img.shape != gt_img.shape:
            issues.append(f"Dimension mismatch in {low_p.name}: low {low_img.shape} vs gt {gt_img.shape}")
            continue

        low_mean = float(np.mean(low_img))
        gt_mean = float(np.mean(gt_img))

        if low_mean >= gt_mean:
            issues.append(f"Warning: Low image {low_p.name} mean ({low_mean:.1f}) >= GT ({gt_mean:.1f})")

        matched_pairs.append({
            "id": low_p.stem,
            "dimensions": low_img.shape,
            "low_brightness": low_mean,
            "gt_brightness": gt_mean
        })

    return {
        "status": "valid" if not issues else "valid_with_warnings",
        "matched_pairs": len(matched_pairs),
        "pairs": matched_pairs,
        "issues": issues
    }

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent / "data" / "eval_pairs"
    print(f"Validating dataset at: {base_dir}")
    report = validate_paired_dataset(base_dir)
    print(f"Status: {report['status']}")
    print(f"Matched pairs: {report['matched_pairs']}")
    for p in report["pairs"]:
        print(f"  [{p['id']}] shape={p['dimensions']}, Low mean={p['low_brightness']:.1f}, GT mean={p['gt_brightness']:.1f}")
    if report["issues"]:
        print("Issues/Warnings:")
        for iss in report["issues"]:
            print(f"  - {iss}")
