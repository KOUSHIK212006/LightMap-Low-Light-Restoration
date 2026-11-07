#!/usr/bin/env python3
"""Dataset validation script for LightMap.

Scans the local filesystem for the four core low-light restoration benchmark datasets:
1. LOL-v1 (Low-Light Dataset v1)
2. LOL-v2 Real (Captured)
3. LOL-v2 Synthetic
4. MIT-Adobe FiveK

Verifies:
- Directory existence and path structures.
- Supported image formats (.png, .jpg, .jpeg, .tif, .tiff, .dng).
- Image file integrity and decodability.
- Paired correspondence between low-light inputs and normal-light ground truths.
- Missing pair detection.
- Quantitative inventory summaries.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from PIL import Image

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".dng"}


def get_default_dataset_paths(base_dir: str | Path) -> dict[str, dict[str, Path]]:
    base = Path(base_dir).resolve()
    return {
        "LOL-v1": {
            "root": base / "LOLv1",
            "low": base / "LOLv1" / "eval15" / "low",
            "normal": base / "LOLv1" / "eval15" / "high",
        },
        "LOL-v2 Real": {
            "root": base / "LOLv2" / "Real_captured",
            "low": base / "LOLv2" / "Real_captured" / "Test" / "Low",
            "normal": base / "LOLv2" / "Real_captured" / "Test" / "Normal",
        },
        "LOL-v2 Synthetic": {
            "root": base / "LOLv2" / "Synthetic",
            "low": base / "LOLv2" / "Synthetic" / "Test" / "Low",
            "normal": base / "LOLv2" / "Synthetic" / "Test" / "Normal",
        },
        "MIT-Adobe FiveK": {
            "root": base / "MIT_FiveK",
            "low": base / "MIT_FiveK" / "input",
            "normal": base / "MIT_FiveK" / "expertC",
        },
    }


def validate_image_file(file_path: Path) -> bool:
    try:
        with Image.open(file_path) as img:
            img.verify()
        # Verify does not decode data fully, reopen to verify pixel decode
        with Image.open(file_path) as img:
            img.load()
        return True
    except Exception:
        return False


def validate_single_dataset(name: str, config: dict[str, Path]) -> dict:
    root = config["root"]
    low_dir = config["low"]
    normal_dir = config["normal"]

    result = {
        "name": name,
        "root_exists": root.exists(),
        "low_exists": low_dir.exists(),
        "normal_exists": normal_dir.exists(),
        "low_count": 0,
        "normal_count": 0,
        "matched_pairs": 0,
        "missing_pairs": [],
        "corrupt_files": [],
        "status": "MISSING",
    }

    if not root.exists() or not low_dir.exists():
        return result

    low_files = {
        p.stem: p for p in low_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    }
    result["low_count"] = len(low_files)

    normal_files = {}
    if normal_dir.exists():
        normal_files = {
            p.stem: p for p in normal_dir.iterdir()
            if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
        }
    result["normal_count"] = len(normal_files)

    # Check decodability of a sample or all low files
    for stem, p in list(low_files.items())[:50]:
        if not validate_image_file(p):
            result["corrupt_files"].append(str(p))

    # Match pairs
    if normal_files:
        for stem in low_files:
            if stem in normal_files:
                result["matched_pairs"] += 1
            else:
                result["missing_pairs"].append(stem)

    if result["low_count"] > 0:
        if result["normal_count"] > 0 and result["matched_pairs"] == result["low_count"]:
            result["status"] = "VERIFIED_PAIRED"
        elif result["normal_count"] > 0:
            result["status"] = "PARTIAL_PAIRED"
        else:
            result["status"] = "UNPAIRED_ONLY"

    return result


def main():
    parser = argparse.ArgumentParser(description="Validate LightMap evaluation datasets.")
    parser.add_argument(
        "--data-dir",
        default="datasets",
        help="Base directory containing downloaded datasets (default: 'datasets').",
    )
    args = parser.parse_args()

    base_dir = Path(args.data_dir).resolve()
    print("=" * 70)
    print("LIGHTMAP DATASET INTEGRITY & VALIDATION SCANNER")
    print("=" * 70)
    print(f"Scanning base directory: {base_dir}")

    dataset_configs = get_default_dataset_paths(base_dir)
    results = []

    for name, config in dataset_configs.items():
        res = validate_single_dataset(name, config)
        results.append(res)

    print("\nSUMMARY TABLE:")
    print("-" * 75)
    print(f"{'Dataset Name':<18} | {'Status':<16} | {'Low Files':<10} | {'Normal Files':<12} | {'Pairs':<6}")
    print("-" * 75)

    all_missing = True
    for r in results:
        if r["root_exists"]:
            all_missing = False
        print(f"{r['name']:<18} | {r['status']:<16} | {r['low_count']:<10} | {r['normal_count']:<12} | {r['matched_pairs']:<6}")

    print("-" * 75)

    if all_missing:
        print("\n[NOTE] No datasets found under the specified directory.")
        print("As per project specifications, official evaluation datasets (LOL, LOL-v2, MIT-FiveK)")
        print("are maintained on Google Drive and must NOT be committed to GitHub.")
        print("\nTo setup datasets locally:")
        print("1. Download dataset ZIP archives from team Google Drive.")
        print("2. Extract into the 'datasets/' directory according to the manifest:")
        for name, cfg in dataset_configs.items():
            print(f"   - {name}: {cfg['root']}")
        print("3. Re-run: python scripts/validate_datasets.py --data-dir datasets")
    else:
        for r in results:
            if r["corrupt_files"]:
                print(f"\n[WARNING] Corrupted images found in {r['name']}: {len(r['corrupt_files'])}")
            if r["missing_pairs"]:
                print(f"[WARNING] Missing corresponding normal pairs in {r['name']}: {len(r['missing_pairs'])}")

    print("\nScan completed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

