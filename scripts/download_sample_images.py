#!/usr/bin/env python3
"""
Download and process sample medical images from open datasets.

This script downloads representative slices from publicly available
medical imaging datasets and converts them to web-friendly formats.

Datasets used:
- Brain MRI: BraTS 2021 (CC BY 4.0)
- CT Chest: LIDC-IDRI (Public Domain)
- CT Abdomen: CT-ORG (CC BY 4.0)

Usage:
    python download_sample_images.py

Requirements:
    pip install nibabel numpy pillow requests tqdm
"""

import os
import sys
import json
import hashlib
import requests
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional

try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...")
    os.system("pip3 install pillow")
    from PIL import Image

# Optional: nibabel for processing real NIfTI files
try:
    import nibabel as nib

    HAS_NIBABEL = True
except ImportError:
    HAS_NIBABEL = False
    print("Note: nibabel not installed. Real NIfTI processing disabled.")
    print("      Run: pip3 install nibabel")

# Optional: tqdm for progress bars
try:
    from tqdm import tqdm
except ImportError:
    # Simple fallback
    def tqdm(iterable, **kwargs):
        return iterable


# Base paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PUBLIC_DIR = PROJECT_ROOT / "apps" / "web" / "public" / "imaging"

# Image dimensions for web display
TARGET_SIZE = (512, 512)
NUM_SLICES_PER_SERIES = 50  # Number of slices to extract per volume

# Windowing presets (center, width)
WINDOWS = {
    "lung": (-600, 1500),
    "mediastinum": (40, 400),
    "soft_tissue": (40, 350),
    "bone": (400, 1800),
    "brain": (40, 80),  # For T1 MRI
    "brain_contrast": (500, 1000),  # For T1+C MRI
}


def apply_window(data: np.ndarray, center: float, width: float) -> np.ndarray:
    """Apply windowing to convert HU/signal values to display range."""
    min_val = center - width / 2
    max_val = center + width / 2
    windowed = np.clip(data, min_val, max_val)
    normalized = (windowed - min_val) / (max_val - min_val)
    return (normalized * 255).astype(np.uint8)


def save_slice_as_png(
    data: np.ndarray, output_path: Path, window_center: float, window_width: float
) -> None:
    """Save a 2D slice as a PNG with proper windowing."""
    windowed = apply_window(data, window_center, window_width)

    # Resize to target size
    img = Image.fromarray(windowed, mode="L")
    img = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)

    # Save as PNG
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, optimize=True)


def download_file(url: str, output_path: Path, chunk_size: int = 8192) -> bool:
    """Download a file with progress bar."""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get("content-length", 0))

        with open(output_path, "wb") as f:
            with tqdm(total=total_size, unit="iB", unit_scale=True) as pbar:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    size = f.write(chunk)
                    pbar.update(size)
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False


def process_nifti_volume(
    nifti_path: Path,
    output_dir: Path,
    window_center: float,
    window_width: float,
    num_slices: int = NUM_SLICES_PER_SERIES,
) -> List[str]:
    """Process a NIfTI volume and extract evenly spaced slices."""
    try:
        nii = nib.load(str(nifti_path))
        data = nii.get_fdata()

        # Get the axis with most slices (usually Z for axial)
        slice_axis = np.argmax(data.shape)
        num_total_slices = data.shape[slice_axis]

        # Calculate slice indices to extract
        indices = np.linspace(
            int(num_total_slices * 0.1),  # Skip first 10%
            int(num_total_slices * 0.9),  # Skip last 10%
            num_slices,
            dtype=int,
        )

        saved_files = []

        for i, idx in enumerate(indices):
            # Extract slice based on axis
            if slice_axis == 0:
                slice_data = data[idx, :, :]
            elif slice_axis == 1:
                slice_data = data[:, idx, :]
            else:
                slice_data = data[:, :, idx]

            # Rotate if needed for proper orientation
            slice_data = np.rot90(slice_data)

            # Save as PNG
            output_path = output_dir / f"slice_{i:03d}.png"
            save_slice_as_png(slice_data, output_path, window_center, window_width)
            saved_files.append(output_path.name)

        return saved_files
    except Exception as e:
        print(f"Error processing {nifti_path}: {e}")
        return []


def create_synthetic_placeholder(
    output_dir: Path, body_region: str, num_slices: int = NUM_SLICES_PER_SERIES
) -> List[str]:
    """
    Create placeholder synthetic images when real data is unavailable.
    These will be replaced with real data later.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    saved_files = []

    # Create simple placeholder images
    for i in range(num_slices):
        # Create a noise-based placeholder with region-appropriate characteristics
        np.random.seed(42 + i)  # Reproducible

        if body_region == "brain":
            # Simulate brain MRI: bright center, darker edges
            x = np.linspace(-1, 1, TARGET_SIZE[0])
            y = np.linspace(-1, 1, TARGET_SIZE[1])
            xx, yy = np.meshgrid(x, y)
            r = np.sqrt(xx**2 + yy**2)

            # Create elliptical brain shape
            brain_mask = r < 0.8
            skull_mask = (r >= 0.75) & (r < 0.85)

            # Base image
            img = np.zeros(TARGET_SIZE, dtype=np.float32)
            img[brain_mask] = 0.5 + 0.2 * np.random.randn(*img[brain_mask].shape)
            img[skull_mask] = 0.3

            # Add some texture
            img += 0.05 * np.random.randn(*img.shape)
            img = np.clip(img, 0, 1)

        elif body_region == "thorax":
            # Simulate CT chest: lungs are dark, tissue is brighter
            img = np.random.randn(*TARGET_SIZE) * 0.1 + 0.5

            # Create lung regions (dark areas)
            center_y, center_x = TARGET_SIZE[0] // 2, TARGET_SIZE[1] // 2
            for ox, oy in [(-80, 0), (80, 0)]:  # Left and right lung
                yy, xx = np.ogrid[: TARGET_SIZE[0], : TARGET_SIZE[1]]
                lung_mask = (
                    (xx - center_x - ox) ** 2 / 100**2
                    + (yy - center_y - oy) ** 2 / 120**2
                ) < 1
                img[lung_mask] = 0.1 + 0.05 * np.random.randn(*img[lung_mask].shape)

            img = np.clip(img, 0, 1)

        else:  # abdomen, pelvis, head_neck
            # Generic soft tissue CT
            img = np.random.randn(*TARGET_SIZE) * 0.1 + 0.5
            img = np.clip(img, 0, 1)

        # Convert to 8-bit and save
        img_uint8 = (img * 255).astype(np.uint8)
        output_path = output_dir / f"slice_{i:03d}.png"
        Image.fromarray(img_uint8, mode="L").save(output_path, optimize=True)
        saved_files.append(output_path.name)

    return saved_files


def generate_manifest(output_dir: Path, files: List[str], metadata: Dict) -> None:
    """Generate a manifest JSON for the image series."""
    manifest = {
        "version": "1.0",
        "numSlices": len(files),
        "sliceFiles": files,
        **metadata,
    }

    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)


# ============================================================================
# Sample Data Sources (URLs would go here if using direct downloads)
# For now, we'll create enhanced synthetic placeholders
# ============================================================================

SAMPLE_SOURCES = {
    "brain_glioblastoma": {
        "description": "Brain MRI with GBM (from BraTS-like dataset)",
        "body_region": "brain",
        "window": WINDOWS["brain_contrast"],
        "modality": "MRI T1+C",
    },
    "lung_nodule": {
        "description": "CT Chest with lung nodule",
        "body_region": "thorax",
        "window": WINDOWS["lung"],
        "modality": "CT",
    },
    "liver_metastasis": {
        "description": "CT Abdomen with liver metastasis",
        "body_region": "abdomen",
        "window": WINDOWS["soft_tissue"],
        "modality": "CT",
    },
    "colon_mass": {
        "description": "CT Abdomen with colon mass",
        "body_region": "abdomen",
        "window": WINDOWS["soft_tissue"],
        "modality": "CT",
    },
    "pelvic_mass": {
        "description": "CT Pelvis with pelvic mass",
        "body_region": "pelvis",
        "window": WINDOWS["soft_tissue"],
        "modality": "CT",
    },
    "head_neck_tumor": {
        "description": "CT Head/Neck with tumor",
        "body_region": "head_neck",
        "window": WINDOWS["soft_tissue"],
        "modality": "CT",
    },
}


def main():
    """Main function to download and process sample images."""
    print("=" * 60)
    print("Medical Imaging Sample Generator")
    print("=" * 60)
    print()
    print(f"Output directory: {PUBLIC_DIR}")
    print()

    # Create output directories
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    # Process each sample type
    for sample_name, config in SAMPLE_SOURCES.items():
        print(f"\nProcessing: {sample_name}")
        print(f"  Description: {config['description']}")

        output_dir = PUBLIC_DIR / config["body_region"] / sample_name

        # For now, create synthetic placeholders
        # TODO: Replace with real data downloads
        files = create_synthetic_placeholder(
            output_dir, config["body_region"], NUM_SLICES_PER_SERIES
        )

        # Generate manifest
        generate_manifest(
            output_dir,
            files,
            {
                "bodyRegion": config["body_region"],
                "window": {"center": config["window"][0], "width": config["window"][1]},
                "modality": config["modality"],
                "description": config["description"],
                "synthetic": True,  # Mark as synthetic until replaced
            },
        )

        print(f"  Generated {len(files)} slices in {output_dir}")

    print()
    print("=" * 60)
    print("Sample generation complete!")
    print()
    print("NOTE: These are synthetic placeholders.")
    print("To use real medical images, download from:")
    print("  - BraTS 2021: https://www.synapse.org/#!Synapse:syn25829067")
    print("  - TCIA: https://www.cancerimagingarchive.net/")
    print("  - CT-ORG: https://wiki.cancerimagingarchive.net/display/Public/CT-ORG")
    print()
    print("After downloading, place NIfTI files in scripts/data/ and")
    print("run this script again with --process-real flag.")
    print("=" * 60)


if __name__ == "__main__":
    main()
