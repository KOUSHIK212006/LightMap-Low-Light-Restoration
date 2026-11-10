#!/usr/bin/env python3
"""Run real dataset evaluation with genuine reference pairs.

Computes PSNR, SSIM, MS-SSIM, LPIPS, VIF, Edge Preservation,
Colour Deviation, clipping ratio, and Latency for:
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
import torch
from scipy.ndimage import uniform_filter
from skimage.metrics import peak_signal_noise_ratio as compute_psnr
from skimage.metrics import structural_similarity as compute_ssim

import lpips
from pytorch_msssim import ms_ssim

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.services.restoration_service import RestorationService
from ai_engine.adaptive_fusion import adaptive_fusion, adaptive_fusion_v1_legacy

# ---------------------------------------------------------------------------
# Initialize LPIPS model once (AlexNet backbone)
# ---------------------------------------------------------------------------
loss_fn = lpips.LPIPS(net='alex')


# ---------------------------------------------------------------------------
# New metric helper functions
# ---------------------------------------------------------------------------

def compute_lpips(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute LPIPS (lower is better). Images are uint8 RGB [H, W, 3]."""
    t1 = torch.from_numpy(img1).permute(2, 0, 1).unsqueeze(0).float() / 127.5 - 1.0
    t2 = torch.from_numpy(img2).permute(2, 0, 1).unsqueeze(0).float() / 127.5 - 1.0
    with torch.no_grad():
        return float(loss_fn(t1, t2))


def compute_ms_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """Compute MS-SSIM (higher is better). Images are uint8 RGB [H, W, 3]."""
    t1 = torch.from_numpy(img1).permute(2, 0, 1).unsqueeze(0).float()
    t2 = torch.from_numpy(img2).permute(2, 0, 1).unsqueeze(0).float()
    with torch.no_grad():
        return float(ms_ssim(t1, t2, data_range=255, size_average=True))


def compute_vif(ref: np.ndarray, dist: np.ndarray) -> float:
    """Simplified Visual Information Fidelity (higher is better).

    Uses local statistics with a sliding window approach.
    """
    ref_gray = np.mean(ref.astype(np.float64), axis=2)
    dist_gray = np.mean(dist.astype(np.float64), axis=2)

    sigma_nsq = 2.0  # noise variance estimate
    eps = 1e-10
    num = 0.0
    den = 0.0

    for scale in range(1, 5):
        N = 2 ** (scale + 1) + 1
        # Local means
        mu1 = uniform_filter(ref_gray, size=N)
        mu2 = uniform_filter(dist_gray, size=N)
        # Local variances and covariance
        mu1_sq = mu1 * mu1
        mu2_sq = mu2 * mu2
        mu1_mu2 = mu1 * mu2
        sigma1_sq = uniform_filter(ref_gray * ref_gray, size=N) - mu1_sq
        sigma2_sq = uniform_filter(dist_gray * dist_gray, size=N) - mu2_sq
        sigma12 = uniform_filter(ref_gray * dist_gray, size=N) - mu1_mu2

        sigma1_sq = np.maximum(sigma1_sq, 0)
        sigma2_sq = np.maximum(sigma2_sq, 0)

        g = sigma12 / (sigma1_sq + eps)
        sv_sq = sigma2_sq - g * sigma12

        # Clamp
        g[sigma1_sq < eps] = 0
        sv_sq[sigma1_sq < eps] = sigma2_sq[sigma1_sq < eps]
        sigma1_sq[sigma1_sq < eps] = 0

        g[sigma2_sq < eps] = 0
        sv_sq[sigma2_sq < eps] = 0

        sv_sq[g < 0] = sigma2_sq[g < 0]
        g[g < 0] = 0
        sv_sq[sv_sq <= eps] = eps

        num += np.sum(np.log10(1 + g * g * sigma1_sq / (sv_sq + sigma_nsq)))
        den += np.sum(np.log10(1 + sigma1_sq / sigma_nsq))

        # Downsample for next scale
        ref_gray = ref_gray[::2, ::2]
        dist_gray = dist_gray[::2, ::2]

    if den == 0:
        return 1.0
    return float(num / den)


def compute_edge_preservation(ref: np.ndarray, restored: np.ndarray) -> float:
    """Edge preservation score via Sobel correlation (higher is better)."""
    ref_gray = cv2.cvtColor(ref, cv2.COLOR_RGB2GRAY)
    rest_gray = cv2.cvtColor(restored, cv2.COLOR_RGB2GRAY)
    ref_edges = np.sqrt(
        cv2.Sobel(ref_gray, cv2.CV_64F, 1, 0) ** 2
        + cv2.Sobel(ref_gray, cv2.CV_64F, 0, 1) ** 2
    )
    rest_edges = np.sqrt(
        cv2.Sobel(rest_gray, cv2.CV_64F, 1, 0) ** 2
        + cv2.Sobel(rest_gray, cv2.CV_64F, 0, 1) ** 2
    )
    return float(np.corrcoef(ref_edges.flatten(), rest_edges.flatten())[0, 1])


def compute_colour_deviation(ref: np.ndarray, restored: np.ndarray) -> float:
    """Mean CIE Lab angular difference (lower is better, in degrees)."""
    ref_lab = cv2.cvtColor(ref, cv2.COLOR_RGB2LAB).astype(np.float32)
    rest_lab = cv2.cvtColor(restored, cv2.COLOR_RGB2LAB).astype(np.float32)
    delta = ref_lab - rest_lab
    delta_e = np.sqrt(np.sum(delta ** 2, axis=2))
    return float(np.mean(delta_e))


def eval_all_metrics(gt: np.ndarray, restored: np.ndarray) -> dict:
    """Compute all quality metrics for a restored vs ground-truth pair."""
    psnr = compute_psnr(gt, restored, data_range=255)
    ssim = compute_ssim(gt, restored, channel_axis=2, data_range=255)
    ms_ssim_val = compute_ms_ssim(gt, restored)
    lpips_val = compute_lpips(gt, restored)
    vif = compute_vif(gt, restored)
    edge = compute_edge_preservation(gt, restored)
    colour = compute_colour_deviation(gt, restored)
    clip = float(np.mean(restored >= 250) * 100.0)
    return {
        "psnr": psnr,
        "ssim": ssim,
        "ms_ssim": ms_ssim_val,
        "lpips": lpips_val,
        "vif": vif,
        "edge_preservation": edge,
        "colour_deviation": colour,
        "clipping": clip,
    }


def _make_empty_stats() -> dict:
    return {
        "psnr": [], "ssim": [], "ms_ssim": [], "lpips": [],
        "vif": [], "edge_preservation": [], "colour_deviation": [],
        "clipping": [], "latency": [],
    }


def _record_from_metrics(image_id: str, method: str, m: dict,
                         latency_ms: float, notes: str) -> dict:
    return {
        "image_id": image_id,
        "split": "test",
        "method": method,
        "psnr": f"{m['psnr']:.2f}",
        "ssim": f"{m['ssim']:.4f}",
        "ms_ssim": f"{m['ms_ssim']:.4f}",
        "lpips": f"{m['lpips']:.4f}",
        "vif": f"{m['vif']:.4f}",
        "edge_preservation": f"{m['edge_preservation']:.4f}",
        "colour_deviation": f"{m['colour_deviation']:.2f}",
        "clipping_pct": f"{m['clipping']:.2f}",
        "latency_ms": f"{latency_ms:.1f}",
        "notes": notes,
    }


def _accumulate(stats: dict, m: dict, latency_ms: float) -> None:
    for key in ("psnr", "ssim", "ms_ssim", "lpips", "vif",
                "edge_preservation", "colour_deviation", "clipping"):
        stats[key].append(m[key])
    stats["latency"].append(latency_ms)


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

    records: list[dict] = []
    print(f"Starting real dataset evaluation on {len(low_files)} reference pairs (LOL-v2 Real test split)...")

    summary_stats = {
        "Raw Input (Baseline)": _make_empty_stats(),
        "E1: Classical CV": _make_empty_stats(),
        "E2: Retinexformer (DL)": _make_empty_stats(),
        "E3: Old Legacy Fusion (v1)": _make_empty_stats(),
        "E4: LightMap Adaptive Hybrid (v2)": _make_empty_stats(),
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
        m_raw = eval_all_metrics(gt_rgb, low_rgb)
        _accumulate(summary_stats["Raw Input (Baseline)"], m_raw, 0.0)
        records.append(_record_from_metrics(
            image_id, "Raw Input (Baseline)", m_raw, 0.0,
            "Original unprocessed low-light capture",
        ))

        # 2. E1: Classical CV only
        t0 = time.time()
        c_res, _, _ = service._call_classical_branch(low_rgb, "natural", {})
        c_lat = (time.time() - t0) * 1000
        if c_res is not None:
            m_e1 = eval_all_metrics(gt_rgb, c_res)
            _accumulate(summary_stats["E1: Classical CV"], m_e1, c_lat)
            records.append(_record_from_metrics(
                image_id, "E1_Classical_CV", m_e1, c_lat,
                "CLAHE + Gamma + Retinex + Bilateral",
            ))

        # 3. E2: Retinexformer only
        t0 = time.time()
        d_res, _ = service._call_deep_branch(low_rgb, "natural")
        d_lat = (time.time() - t0) * 1000
        if d_res is not None:
            m_e2 = eval_all_metrics(gt_rgb, d_res)
            _accumulate(summary_stats["E2: Retinexformer (DL)"], m_e2, d_lat)
            records.append(_record_from_metrics(
                image_id, "E2_Retinexformer", m_e2, d_lat,
                "Pretrained LOL-v2 Real Transformer",
            ))

        # 4. E3: Old Legacy Fusion (v1)
        if c_res is not None and d_res is not None:
            t0 = time.time()
            v1_out = adaptive_fusion_v1_legacy(low_rgb, c_res, d_res)
            v1_img = v1_out["image"]
            v1_lat = (time.time() - t0) * 1000 + c_lat + d_lat
            m_e3 = eval_all_metrics(gt_rgb, v1_img)
            _accumulate(summary_stats["E3: Old Legacy Fusion (v1)"], m_e3, v1_lat)
            records.append(_record_from_metrics(
                image_id, "E3_Legacy_Fusion_v1", m_e3, v1_lat,
                "Legacy rule W = clip((0.5-illum)*2, 0.2, 0.9)",
            ))

        # 5. E4: LightMap Deep-First Adaptive Hybrid (v2)
        if c_res is not None and d_res is not None:
            t0 = time.time()
            v2_out = adaptive_fusion(low_rgb, c_res, d_res)
            v2_img = v2_out["image"]
            v2_lat = (time.time() - t0) * 1000 + c_lat + d_lat
            m_e4 = eval_all_metrics(gt_rgb, v2_img)
            _accumulate(summary_stats["E4: LightMap Adaptive Hybrid (v2)"], m_e4, v2_lat)
            records.append(_record_from_metrics(
                image_id, "E4_LightMap_Hybrid_v2", m_e4, v2_lat,
                "Deep-first fusion with highlight recovery and guided edge stabilization",
            ))

            if m_e4["psnr"] >= m_e2["psnr"]:
                hybrid_wins += 1
            else:
                deep_wins += 1

        print(
            f"[{image_id}] Deep: {m_e2['psnr']:.2f}dB / {m_e2['ssim']:.4f} | "
            f"Hybrid v2: {m_e4['psnr']:.2f}dB / {m_e4['ssim']:.4f} "
            f"(clip {m_e4['clipping']:.2f}% vs {m_e2['clipping']:.2f}%)"
        )

    # Write CSV
    fieldnames = [
        "image_id", "split", "method", "psnr", "ssim", "ms_ssim", "lpips",
        "vif", "edge_preservation", "colour_deviation", "clipping_pct",
        "latency_ms", "notes",
    ]
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    # Print summary
    print(f"\n{'=' * 160}")
    print(f"{'FINAL BENCHMARK SUMMARY':^160}")
    print(f"{'=' * 160}")
    header = (
        f"{'Method':<35} | {'PSNR (dB)':<15} | {'SSIM':<12} | {'MS-SSIM':<12} | "
        f"{'LPIPS':<12} | {'VIF':<10} | {'Edge Pres.':<10} | "
        f"{'Colour Dev':<10} | {'Clip %':<8} | {'Latency':<8}"
    )
    print(header)
    print("-" * 160)
    for method, vals in summary_stats.items():
        if not vals["psnr"]:
            continue
        m_p = np.mean(vals["psnr"])
        s_p = np.std(vals["psnr"])
        m_s = np.mean(vals["ssim"])
        m_ms = np.mean(vals["ms_ssim"])
        m_lp = np.mean(vals["lpips"])
        m_v = np.mean(vals["vif"])
        m_e = np.mean(vals["edge_preservation"])
        m_cd = np.mean(vals["colour_deviation"])
        m_c = np.mean(vals["clipping"])
        m_l = np.mean(vals["latency"])
        print(
            f"{method:<35} | {m_p:.2f} ± {s_p:.2f} dB | {m_s:.4f}      | {m_ms:.4f}      | "
            f"{m_lp:.4f}      | {m_v:.4f}    | {m_e:.4f}    | "
            f"{m_cd:.2f}      | {m_c:.2f}%  | {m_l:.0f} ms"
        )
    print("-" * 160)
    print(f"Per-image PSNR win count: Hybrid v2 wins {hybrid_wins}, Deep wins {deep_wins}")
    print(f"Evaluation report successfully updated at: {csv_path}")


if __name__ == "__main__":
    run_evaluation()
