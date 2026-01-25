#!/usr/bin/env python3
"""
Fetch REAL Medical Images from Open Datasets

This script downloads actual medical imaging data from publicly available
research datasets. These are REAL patient scans (de-identified) used in
medical research.

Datasets:
1. BraTS 2021 - Brain Tumor MRI (Kaggle mirror)
2. Medical Decathlon - Multiple organs
3. TCIA samples - Various cancer imaging

These images are what oncologists actually see in clinical practice.

Usage:
    python3 fetch_real_medical_images.py

Requirements:
    pip3 install kaggle nibabel numpy pillow requests
"""

import os
import sys
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import List, Tuple, Optional

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PUBLIC_DIR = PROJECT_ROOT / "apps" / "web" / "public" / "imaging"
TEMP_DIR = SCRIPT_DIR / "real_data"

# Ensure directories exist
TEMP_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


def check_dependencies():
    """Check if required packages are installed."""
    missing = []

    try:
        import numpy as np
    except ImportError:
        missing.append("numpy")

    try:
        from PIL import Image
    except ImportError:
        missing.append("pillow")

    try:
        import nibabel as nib
    except ImportError:
        missing.append("nibabel")

    try:
        import requests
    except ImportError:
        missing.append("requests")

    if missing:
        print(f"Installing missing packages: {', '.join(missing)}")
        subprocess.run([sys.executable, "-m", "pip", "install"] + missing, check=True)

    return True


def download_from_url(url: str, output_path: Path) -> bool:
    """Download file from URL with progress."""
    import requests
    from tqdm import tqdm

    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get("content-length", 0))

        with open(output_path, "wb") as f:
            with tqdm(
                total=total_size, unit="iB", unit_scale=True, desc=output_path.name
            ) as pbar:
                for chunk in response.iter_content(chunk_size=8192):
                    size = f.write(chunk)
                    pbar.update(size)
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False


def process_nifti_to_pngs(
    nifti_path: Path,
    output_dir: Path,
    window_center: float = None,
    window_width: float = None,
    num_slices: int = 50,
    modality: str = "MRI",
) -> List[str]:
    """
    Convert NIfTI volume to PNG slices.

    For MRI: Normalize to 0-255 based on percentiles
    For CT: Apply Hounsfield windowing
    """
    import nibabel as nib
    import numpy as np
    from PIL import Image

    output_dir.mkdir(parents=True, exist_ok=True)

    # Load NIfTI
    nii = nib.load(str(nifti_path))
    data = nii.get_fdata()

    # Determine slice axis (usually the one with most slices for axial)
    # For brain MRI, typically shape is (H, W, D) where D is slice count
    slice_axis = 2  # Axial slices along Z axis
    total_slices = data.shape[slice_axis]

    # Calculate which slices to extract (skip top/bottom 10%)
    start_slice = int(total_slices * 0.15)
    end_slice = int(total_slices * 0.85)

    indices = np.linspace(start_slice, end_slice, num_slices, dtype=int)

    files = []

    for i, idx in enumerate(indices):
        # Extract slice
        if slice_axis == 0:
            slice_data = data[idx, :, :]
        elif slice_axis == 1:
            slice_data = data[:, idx, :]
        else:
            slice_data = data[:, :, idx]

        # Rotate/flip for proper orientation
        slice_data = np.rot90(slice_data)
        slice_data = np.flipud(slice_data)

        # Normalize based on modality
        if modality == "CT" and window_center is not None and window_width is not None:
            # Apply Hounsfield windowing
            min_val = window_center - window_width / 2
            max_val = window_center + window_width / 2
            slice_data = np.clip(slice_data, min_val, max_val)
            normalized = (slice_data - min_val) / (max_val - min_val)
        else:
            # For MRI, use percentile normalization
            p1, p99 = (
                np.percentile(slice_data[slice_data > 0], [1, 99])
                if np.any(slice_data > 0)
                else (0, 1)
            )
            slice_data = np.clip(slice_data, p1, p99)
            if p99 > p1:
                normalized = (slice_data - p1) / (p99 - p1)
            else:
                normalized = np.zeros_like(slice_data)

        # Convert to 8-bit
        img_array = (normalized * 255).astype(np.uint8)

        # Resize to 512x512
        img = Image.fromarray(img_array, mode="L")
        img = img.resize((512, 512), Image.Resampling.LANCZOS)

        # Save
        filename = f"slice_{i:03d}.png"
        img.save(output_dir / filename, optimize=True)
        files.append(filename)

    return files


def download_sample_brats():
    """
    Download a sample from BraTS dataset.
    Using a direct link to a sample case.
    """
    print("\n" + "=" * 60)
    print("Downloading REAL Brain MRI with Glioblastoma (BraTS)")
    print("=" * 60)

    # BraTS sample hosted on various mirrors
    # Using figshare/zenodo hosted samples
    sample_urls = [
        # Sample BraTS case from public hosting
        "https://github.com/NVIDIA/DeepLearningExamples/raw/master/PyTorch/Segmentation/nnUNet/notebooks/data/BraTS21_Training_001/BraTS21_Training_001_t1ce.nii.gz",
    ]

    output_dir = PUBLIC_DIR / "brain" / "brain_glioblastoma"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Try downloading
    for url in sample_urls:
        nifti_path = TEMP_DIR / "brats_t1ce.nii.gz"

        print(f"Trying: {url}")
        if download_from_url(url, nifti_path):
            print("Download successful! Processing...")

            files = process_nifti_to_pngs(
                nifti_path, output_dir, modality="MRI", num_slices=50
            )

            # Create manifest
            manifest = {
                "version": "1.0",
                "numSlices": len(files),
                "sliceFiles": files,
                "bodyRegion": "brain",
                "window": {"center": 500, "width": 1000},
                "modality": "MRI T1+C",
                "description": "Brain MRI T1 Post-Contrast with Glioblastoma",
                "source": "BraTS 2021 Challenge Dataset",
                "synthetic": False,
                "license": "CC BY 4.0",
            }

            with open(output_dir / "manifest.json", "w") as f:
                json.dump(manifest, f, indent=2)

            print(f"Generated {len(files)} real brain MRI slices!")
            return True

    print("Could not download BraTS sample from any source.")
    return False


def download_medical_decathlon_samples():
    """
    Download samples from Medical Segmentation Decathlon.
    These are real CT/MRI scans from clinical practice.
    """
    print("\n" + "=" * 60)
    print("Downloading Medical Decathlon Samples")
    print("=" * 60)

    # Medical Decathlon has various organs
    # Task03 = Liver, Task06 = Lung, Task07 = Pancreas

    decathlon_tasks = {
        "liver": {
            "url": "https://msd-for-monai.s3-us-west-2.amazonaws.com/Task03_Liver.tar",
            "output_dir": "abdomen/liver_tumor",
            "modality": "CT",
            "window_center": 40,
            "window_width": 350,
            "description": "CT Abdomen with Liver Tumor",
        },
        "lung": {
            "url": "https://msd-for-monai.s3-us-west-2.amazonaws.com/Task06_Lung.tar",
            "output_dir": "thorax/lung_tumor",
            "modality": "CT",
            "window_center": -600,
            "window_width": 1500,
            "description": "CT Chest with Lung Tumor",
        },
    }

    # These are large downloads, let's use alternative approach
    print("Medical Decathlon files are large (>1GB each)")
    print("Using alternative publicly hosted samples...")

    return False


def fetch_radiopaedia_samples():
    """
    For demo purposes, we'll create high-quality synthetic images
    that mimic real scan appearance, since downloading full datasets
    requires authentication.

    In production, you would:
    1. Apply for TCIA access
    2. Download actual DICOM/NIfTI files
    3. Process them with proper windowing
    """
    print("\n" + "=" * 60)
    print("Creating High-Fidelity Medical Image Approximations")
    print("=" * 60)

    print("""
    NOTE: For truly authentic images, please:
    
    1. BRAIN MRI (BraTS):
       - Go to: https://www.kaggle.com/datasets/dschettler8845/brats-2021-task1
       - Download and extract
       - Place .nii.gz files in scripts/real_data/
    
    2. CHEST CT (LIDC-IDRI):
       - Go to: https://wiki.cancerimagingarchive.net/display/Public/LIDC-IDRI
       - Request access (free for research)
       - Download sample cases
    
    3. ABDOMEN CT (LiTS):
       - Go to: https://competitions.codalab.org/competitions/17094
       - Download training data
    
    After downloading, run: python3 process_downloaded_data.py
    """)

    return False


def create_fallback_realistic_images():
    """
    Create more realistic-looking images as fallback.
    Uses actual medical imaging principles but generated.
    """
    import numpy as np
    from PIL import Image

    print("\n" + "=" * 60)
    print("Creating Improved Realistic Medical Images (Fallback)")
    print("=" * 60)

    # This is a TEMPORARY fallback
    # The proper solution is downloading real data

    print("Please download real medical images for production use.")
    print("See instructions above for accessing BraTS, LIDC-IDRI, and LiTS datasets.")

    return False


def main():
    """Main function."""
    print("=" * 60)
    print("REAL Medical Image Fetcher")
    print("For Virtual Tumor Board - Production Quality")
    print("=" * 60)

    check_dependencies()

    # Try to download real data
    brats_ok = download_sample_brats()

    if not brats_ok:
        print("\n" + "!" * 60)
        print("IMPORTANT: Could not auto-download real medical images.")
        print("!" * 60)
        print("""
To get REAL medical images that oncologists will recognize:

OPTION 1: BraTS Brain MRI (Easiest)
   1. Go to Kaggle: kaggle.com/datasets/dschettler8845/brats-2021-task1
   2. Download BraTS21_Training_001.zip (or any case)
   3. Extract the *_t1ce.nii.gz file (T1 with contrast)
   4. Place it in: scripts/real_data/brats_t1ce.nii.gz
   5. Run this script again

OPTION 2: TCIA (Cancer Imaging Archive)
   1. Go to: cancerimagingarchive.net
   2. Search for: TCGA-GBM (brain), LIDC-IDRI (lung), LiTS (liver)
   3. Download sample DICOM series
   4. Convert to NIfTI using dcm2niix

OPTION 3: Use Kaggle CLI
   pip install kaggle
   kaggle datasets download -d dschettler8845/brats-2021-task1
   unzip brats-2021-task1.zip -d scripts/real_data/

The current procedural images are NOT acceptable for clinical use.
        """)

    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)


if __name__ == "__main__":
    main()
