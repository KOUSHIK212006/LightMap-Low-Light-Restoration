#!/usr/bin/env python3
"""Run real dataset evaluation with genuine reference pairs.

Computes PSNR, SSIM, and Latency for:
- E1: Classical CV only
- E2: Retinexformer only
- E4: Fixed-weight classical + DL fusion (0.5 / 0.5)
- E5: LightMap adaptive hybrid fusion (IAAF)

Outputs to evaluation/results/experiment_results.csv
"""
from __future__ import annotations

import csv
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from skimage.metrics import peak_signal_noise_ratio as compute_psnr
from skimage.metrics import structural_similarity as compute_ssim

# Add LightMap root and backend to path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.services.restoration_service import RestorationService
from ai_engine.adaptive_fusion import adaptive_fusion

def run_evaluation():
    data_dir = REPO_ROOT / "data" / "eval_pairs"
    low_dir = data_dir / "low"
    gt_dir = data_dir / "gt"
    results_dir = REPO_ROOT / "evaluation" / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    csv_path = results_dir / "experiment_results.csv"

    service = RestorationService()

    low_files = sorted(low_dir.glob("*.png"))
    if not low_files:
        print("No evaluation pairs found!")
        return

    records = []
    print(f"Starting real dataset evaluation on {len(low_files)} reference pairs...")

    for low_path in low_files:
        image_id = low_path.stem
        gt_path = gt_dir / f"{image_id}.png"
        if not gt_path.exists():
            continue

        low_bgr = cv2.imread(str(low_path))
        gt_bgr = cv2.imread(str(gt_path))
        low_rgb = cv2.cvtColor(low_bgr, cv2.COLOR_BGR2RGB)
        gt_rgb = cv2.cvtColor(gt_bgr, cv2.COLOR_BGR2RGB)

        # Baseline: input vs GT
        psnr_raw = compute_psnr(gt_rgb, low_rgb, data_range=255)
        ssim_raw = compute_ssim(gt_rgb, low_rgb, channel_axis=2, data_range=255)
        records.append({
            "image_id": image_id,
            "split": "test",
            "method": "Raw Input (Baseline)",
            "psnr": f"{psnr_raw:.2f}",
            "ssim": f"{ssim_raw:.4f}",
            "lpips": "NA",
            "niqe": "NA",
            "latency_ms": "0.0",
            "notes": "Original unprocessed low-light capture"
        })

        # E1: Classical CV only
        t0 = time.time()
        c_res, _ = service._call_classical_branch(low_rgb, "natural", {})
        c_lat = (time.time() - t0) * 1000
        if c_res is not None:
            psnr_e1 = compute_psnr(gt_rgb, c_res, data_range=255)
            ssim_e1 = compute_ssim(gt_rgb, c_res, channel_axis=2, data_range=255)
            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E1_Classical_CV",
                "psnr": f"{psnr_e1:.2f}",
                "ssim": f"{ssim_e1:.4f}",
                "lpips": "NA",
                "niqe": "NA",
                "latency_ms": f"{c_lat:.1f}",
                "notes": "CLAHE + Gamma + Retinex + Denoising"
            })

        # E2: Retinexformer only
        t0 = time.time()
        d_res, _ = service._call_deep_branch(low_rgb, "natural")
        d_lat = (time.time() - t0) * 1000
        if d_res is not None:
            psnr_e2 = compute_psnr(gt_rgb, d_res, data_range=255)
            ssim_e2 = compute_ssim(gt_rgb, d_res, channel_axis=2, data_range=255)
            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E2_Retinexformer",
                "psnr": f"{psnr_e2:.2f}",
                "ssim": f"{ssim_e2:.4f}",
                "lpips": "NA",
                "niqe": "NA",
                "latency_ms": f"{d_lat:.1f}",
                "notes": "Pretrained LOL-v2 Real Transformer"
            })

        # E4: Fixed-weight classical + DL fusion (0.5 / 0.5)
        if c_res is not None and d_res is not None:
            t0 = time.time()
            fixed_fused = np.clip(0.5 * c_res.astype(np.float32) + 0.5 * d_res.astype(np.float32), 0, 255).astype(np.uint8)
            f_lat = (time.time() - t0) * 1000 + c_lat + d_lat
            psnr_e4 = compute_psnr(gt_rgb, fixed_fused, data_range=255)
            ssim_e4 = compute_ssim(gt_rgb, fixed_fused, channel_axis=2, data_range=255)
            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E4_Fixed_Weight_Fusion",
                "psnr": f"{psnr_e4:.2f}",
                "ssim": f"{ssim_e4:.4f}",
                "lpips": "NA",
                "niqe": "NA",
                "latency_ms": f"{f_lat:.1f}",
                "notes": "Fixed 50/50 linear blend"
            })

        # E5: LightMap adaptive hybrid fusion (IAAF)
        if c_res is not None and d_res is not None:
            t0 = time.time()
            iaaf_out = adaptive_fusion(low_rgb, c_res, d_res)
            iaaf_img = iaaf_out["image"]
            iaaf_lat = (time.time() - t0) * 1000 + c_lat + d_lat
            psnr_e5 = compute_psnr(gt_rgb, iaaf_img, data_range=255)
            ssim_e5 = compute_ssim(gt_rgb, iaaf_img, channel_axis=2, data_range=255)
            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E5_LightMap_Adaptive_Fusion",
                "psnr": f"{psnr_e5:.2f}",
                "ssim": f"{ssim_e5:.4f}",
                "lpips": "NA",
                "niqe": "NA",
                "latency_ms": f"{iaaf_lat:.1f}",
                "notes": "Illumination-guided spatial weight map (IAAF)"
            })

        print(f"Evaluated pair {image_id}:")
        print(f"  Raw: PSNR={psnr_raw:.2f}, SSIM={ssim_raw:.4f}")
        if c_res is not None:
            print(f"  E1 Classical: PSNR={psnr_e1:.2f}, SSIM={ssim_e1:.4f}")
        if d_res is not None:
            print(f"  E2 Retinexformer: PSNR={psnr_e2:.2f}, SSIM={ssim_e2:.4f}")
        if c_res is not None and d_res is not None:
            print(f"  E4 Fixed Fusion: PSNR={psnr_e4:.2f}, SSIM={ssim_e4:.4f}")
            print(f"  E5 LightMap IAAF: PSNR={psnr_e5:.2f}, SSIM={ssim_e5:.4f}")

    # Write CSV
    fieldnames = ["image_id", "split", "method", "psnr", "ssim", "lpips", "niqe", "latency_ms", "notes"]
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"\nEvaluation successfully written to {csv_path} ({len(records)} entries).")

if __name__ == "__main__":
    run_evaluation()
