#!/usr/bin/env python3
"""Run real dataset evaluation with genuine reference pairs.

Computes PSNR, SSIM, clipping ratio, and Latency for:
- Raw Input (Baseline)
- E1: Classical CV only
- E2: Retinexformer only
- E3: Old Fixed/Static Fusion (v1)
- E4: LightMap Deep-First Adaptive Hybrid (v2)

Outputs to evaluation/results/experiment_results.csv
"""
from __future__ import annotations

import csv
import sys
import time
from pathlib import Path

import cv2
import numpy as np
from skimage.metrics import peak_signal_noise_ratio as compute_psnr
from skimage.metrics import structural_similarity as compute_ssim

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.services.restoration_service import RestorationService
from ai_engine.adaptive_fusion import adaptive_fusion, adaptive_fusion_v1_legacy


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
        print("No evaluation pairs found in", low_dir)
        return

    records = []
    print(f"Starting real dataset evaluation on {len(low_files)} reference pairs (LOL-v2 Real test split)...")

    summary_stats = {
        "Raw Input (Baseline)": {"psnr": [], "ssim": [], "clipping": [], "latency": []},
        "E1: Classical CV": {"psnr": [], "ssim": [], "clipping": [], "latency": []},
        "E2: Retinexformer (DL)": {"psnr": [], "ssim": [], "clipping": [], "latency": []},
        "E3: Old Legacy Fusion (v1)": {"psnr": [], "ssim": [], "clipping": [], "latency": []},
        "E4: LightMap Adaptive Hybrid (v2)": {"psnr": [], "ssim": [], "clipping": [], "latency": []},
    }

    hybrid_wins = 0
    deep_wins = 0

    for low_path in low_files:
        image_id = low_path.stem
        gt_path = gt_dir / f"{image_id}.png"
        if not gt_path.exists():
            continue

        low_bgr = cv2.imread(str(low_path))
        gt_bgr = cv2.imread(str(gt_path))
        low_rgb = cv2.cvtColor(low_bgr, cv2.COLOR_BGR2RGB)
        gt_rgb = cv2.cvtColor(gt_bgr, cv2.COLOR_BGR2RGB)

        # 1. Baseline
        psnr_raw = compute_psnr(gt_rgb, low_rgb, data_range=255)
        ssim_raw = compute_ssim(gt_rgb, low_rgb, channel_axis=2, data_range=255)
        clip_raw = float(np.mean(low_rgb >= 250) * 100.0)
        summary_stats["Raw Input (Baseline)"]["psnr"].append(psnr_raw)
        summary_stats["Raw Input (Baseline)"]["ssim"].append(ssim_raw)
        summary_stats["Raw Input (Baseline)"]["clipping"].append(clip_raw)
        summary_stats["Raw Input (Baseline)"]["latency"].append(0.0)

        records.append({
            "image_id": image_id,
            "split": "test",
            "method": "Raw Input (Baseline)",
            "psnr": f"{psnr_raw:.2f}",
            "ssim": f"{ssim_raw:.4f}",
            "clipping_pct": f"{clip_raw:.2f}",
            "latency_ms": "0.0",
            "notes": "Original unprocessed low-light capture",
        })

        # 2. E1: Classical CV only
        t0 = time.time()
        c_res, _, _ = service._call_classical_branch(low_rgb, "natural", {})
        c_lat = (time.time() - t0) * 1000
        if c_res is not None:
            psnr_e1 = compute_psnr(gt_rgb, c_res, data_range=255)
            ssim_e1 = compute_ssim(gt_rgb, c_res, channel_axis=2, data_range=255)
            clip_e1 = float(np.mean(c_res >= 250) * 100.0)
            summary_stats["E1: Classical CV"]["psnr"].append(psnr_e1)
            summary_stats["E1: Classical CV"]["ssim"].append(ssim_e1)
            summary_stats["E1: Classical CV"]["clipping"].append(clip_e1)
            summary_stats["E1: Classical CV"]["latency"].append(c_lat)

            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E1_Classical_CV",
                "psnr": f"{psnr_e1:.2f}",
                "ssim": f"{ssim_e1:.4f}",
                "clipping_pct": f"{clip_e1:.2f}",
                "latency_ms": f"{c_lat:.1f}",
                "notes": "CLAHE + Gamma + Retinex + Bilateral",
            })

        # 3. E2: Retinexformer only
        t0 = time.time()
        d_res, _ = service._call_deep_branch(low_rgb, "natural")
        d_lat = (time.time() - t0) * 1000
        if d_res is not None:
            psnr_e2 = compute_psnr(gt_rgb, d_res, data_range=255)
            ssim_e2 = compute_ssim(gt_rgb, d_res, channel_axis=2, data_range=255)
            clip_e2 = float(np.mean(d_res >= 250) * 100.0)
            summary_stats["E2: Retinexformer (DL)"]["psnr"].append(psnr_e2)
            summary_stats["E2: Retinexformer (DL)"]["ssim"].append(ssim_e2)
            summary_stats["E2: Retinexformer (DL)"]["clipping"].append(clip_e2)
            summary_stats["E2: Retinexformer (DL)"]["latency"].append(d_lat)

            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E2_Retinexformer",
                "psnr": f"{psnr_e2:.2f}",
                "ssim": f"{ssim_e2:.4f}",
                "clipping_pct": f"{clip_e2:.2f}",
                "latency_ms": f"{d_lat:.1f}",
                "notes": "Pretrained LOL-v2 Real Transformer",
            })

        # 4. E3: Old Legacy Fusion (v1)
        if c_res is not None and d_res is not None:
            t0 = time.time()
            v1_out = adaptive_fusion_v1_legacy(low_rgb, c_res, d_res)
            v1_img = v1_out["image"]
            v1_lat = (time.time() - t0) * 1000 + c_lat + d_lat
            psnr_e3 = compute_psnr(gt_rgb, v1_img, data_range=255)
            ssim_e3 = compute_ssim(gt_rgb, v1_img, channel_axis=2, data_range=255)
            clip_e3 = float(np.mean(v1_img >= 250) * 100.0)
            summary_stats["E3: Old Legacy Fusion (v1)"]["psnr"].append(psnr_e3)
            summary_stats["E3: Old Legacy Fusion (v1)"]["ssim"].append(ssim_e3)
            summary_stats["E3: Old Legacy Fusion (v1)"]["clipping"].append(clip_e3)
            summary_stats["E3: Old Legacy Fusion (v1)"]["latency"].append(v1_lat)

            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E3_Legacy_Fusion_v1",
                "psnr": f"{psnr_e3:.2f}",
                "ssim": f"{ssim_e3:.4f}",
                "clipping_pct": f"{clip_e3:.2f}",
                "latency_ms": f"{v1_lat:.1f}",
                "notes": "Legacy rule W = clip((0.5-illum)*2, 0.2, 0.9)",
            })

        # 5. E4: LightMap Deep-First Adaptive Hybrid (v2)
        if c_res is not None and d_res is not None:
            t0 = time.time()
            v2_out = adaptive_fusion(low_rgb, c_res, d_res)
            v2_img = v2_out["image"]
            v2_lat = (time.time() - t0) * 1000 + c_lat + d_lat
            psnr_e4 = compute_psnr(gt_rgb, v2_img, data_range=255)
            ssim_e4 = compute_ssim(gt_rgb, v2_img, channel_axis=2, data_range=255)
            clip_e4 = float(np.mean(v2_img >= 250) * 100.0)
            summary_stats["E4: LightMap Adaptive Hybrid (v2)"]["psnr"].append(psnr_e4)
            summary_stats["E4: LightMap Adaptive Hybrid (v2)"]["ssim"].append(ssim_e4)
            summary_stats["E4: LightMap Adaptive Hybrid (v2)"]["clipping"].append(clip_e4)
            summary_stats["E4: LightMap Adaptive Hybrid (v2)"]["latency"].append(v2_lat)

            records.append({
                "image_id": image_id,
                "split": "test",
                "method": "E4_LightMap_Hybrid_v2",
                "psnr": f"{psnr_e4:.2f}",
                "ssim": f"{ssim_e4:.4f}",
                "clipping_pct": f"{clip_e4:.2f}",
                "latency_ms": f"{v2_lat:.1f}",
                "notes": "Deep-first fusion with highlight recovery and guided edge stabilization",
            })

            if psnr_e4 >= psnr_e2:
                hybrid_wins += 1
            else:
                deep_wins += 1

        print(f"[{image_id}] Deep: {psnr_e2:.2f}dB / {ssim_e2:.4f} | Hybrid v2: {psnr_e4:.2f}dB / {ssim_e4:.4f} (clip {clip_e4:.2f}% vs {clip_e2:.2f}%)")

    # Write CSV
    fieldnames = ["image_id", "split", "method", "psnr", "ssim", "clipping_pct", "latency_ms", "notes"]
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"\n==================== FINAL BENCHMARK SUMMARY ====================")
    print(f"{'Method':<35} | {'Mean PSNR (dB)':<15} | {'Mean SSIM':<10} | {'Highlight Clip %':<16} | {'Latency':<8}")
    print("-" * 92)
    for method, vals in summary_stats.items():
        m_p = np.mean(vals["psnr"])
        s_p = np.std(vals["psnr"])
        m_s = np.mean(vals["ssim"])
        s_s = np.std(vals["ssim"])
        m_c = np.mean(vals["clipping"])
        m_l = np.mean(vals["latency"])
        print(f"{method:<35} | {m_p:.2f} ± {s_p:.2f} dB   | {m_s:.4f} ± {s_s:.4f} | {m_c:.2f}%           | {m_l:.0f} ms")
    print("-" * 92)
    print(f"Per-image PSNR win count: Hybrid v2 wins {hybrid_wins}, Deep wins {deep_wins}")
    print(f"Evaluation report successfully updated at: {csv_path}")


if __name__ == "__main__":
    run_evaluation()
