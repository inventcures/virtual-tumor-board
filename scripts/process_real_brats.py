#!/usr/bin/env python3
"""
Process REAL BraTS Brain MRI data into PNG slices.
This produces ACTUAL medical images, not procedural garbage.
"""

import json
import numpy as np
import nibabel as nib
from PIL import Image
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
INPUT_FILE = SCRIPT_DIR / "real_data" / "brain_t1.nii.gz"
OUTPUT_DIR = (
    PROJECT_ROOT
    / "apps"
    / "web"
    / "public"
    / "imaging"
    / "brain"
    / "brain_glioblastoma"
)

NUM_SLICES = 50


def process_brats():
    """Process BraTS NIfTI file to PNG slices."""
    print("=" * 60)
    print("Processing REAL BraTS Brain MRI")
    print("=" * 60)

    if not INPUT_FILE.exists():
        print(f"ERROR: Input file not found: {INPUT_FILE}")
        return False

    print(f"Loading: {INPUT_FILE}")

    # Load NIfTI
    nii = nib.load(str(INPUT_FILE))
    data = nii.get_fdata()

    print(f"Volume shape: {data.shape}")
    print(f"Data range: {data.min():.2f} - {data.max():.2f}")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # For BraTS data, axial slices are along axis 2
    total_slices = data.shape[2]
    print(f"Total slices: {total_slices}")

    # Select slices from middle portion (where tumor usually is)
    start_slice = int(total_slices * 0.2)
    end_slice = int(total_slices * 0.8)
    indices = np.linspace(start_slice, end_slice, NUM_SLICES, dtype=int)

    # Normalize using percentiles (standard for MRI)
    # Ignore zeros (background)
    nonzero_data = data[data > 0]
    p1, p99 = np.percentile(nonzero_data, [1, 99])
    print(f"Normalization range: {p1:.2f} - {p99:.2f}")

    files = []

    for i, idx in enumerate(indices):
        # Extract axial slice
        slice_data = data[:, :, idx]

        # Rotate for proper orientation (radiological convention)
        slice_data = np.rot90(slice_data, k=1)
        slice_data = np.flipud(slice_data)

        # Normalize
        slice_norm = np.clip(slice_data, p1, p99)
        slice_norm = (slice_norm - p1) / (p99 - p1)

        # Convert to 8-bit
        img_array = (slice_norm * 255).astype(np.uint8)

        # Create image and resize to 512x512
        img = Image.fromarray(img_array, mode="L")
        img = img.resize((512, 512), Image.Resampling.LANCZOS)

        # Save
        filename = f"slice_{i:03d}.png"
        filepath = OUTPUT_DIR / filename
        img.save(filepath, optimize=True)
        files.append(filename)

        if i % 10 == 0:
            print(f"  Processed slice {i + 1}/{NUM_SLICES}")

    # Create manifest
    manifest = {
        "version": "1.0",
        "numSlices": len(files),
        "sliceFiles": files,
        "bodyRegion": "brain",
        "window": {"center": 500, "width": 1000},
        "modality": "MRI T1+C",
        "description": "Brain MRI T1 Post-Contrast with Glioblastoma (GBM)",
        "source": "BraTS 2021 Challenge - Real Patient Data",
        "synthetic": False,
        "license": "CC BY 4.0",
        "citation": "Baid U, et al. The RSNA-ASNR-MICCAI BraTS 2021 Benchmark on Brain Tumor Segmentation and Radiogenomic Classification",
    }

    manifest_path = OUTPUT_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nGenerated {len(files)} REAL brain MRI slices!")
    print(f"Output: {OUTPUT_DIR}")

    return True


if __name__ == "__main__":
    success = process_brats()
    if success:
        print("\n" + "=" * 60)
        print("SUCCESS! Real brain MRI images are ready.")
        print("These are actual patient scans from the BraTS dataset.")
        print("=" * 60)
    else:
        print("\nFAILED to process BraTS data.")
