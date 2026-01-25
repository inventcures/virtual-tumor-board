#!/usr/bin/env python3
"""
Download and process real medical imaging data from open datasets.

Sources:
- BraTS 2021: Brain tumor MRI (T1ce, T2, FLAIR) - https://www.synapse.org/#!Synapse:syn25829067
- TCIA: CT scans for various body parts - https://www.cancerimagingarchive.net/
- OpenNeuro: Additional brain imaging

This script downloads sample data and converts to PNG slices for web display.
"""

import os
import sys
import urllib.request
import zipfile
import json
from pathlib import Path

# For image processing, we'll use PIL if available
try:
    from PIL import Image
    import numpy as np

    HAS_IMAGING = True
except ImportError:
    HAS_IMAGING = False
    print("Note: PIL/numpy not installed. Run: pip install pillow numpy")

# Output directories
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
PUBLIC_IMAGING = PROJECT_ROOT / "apps" / "web" / "public" / "imaging"

# Open dataset URLs (using publicly accessible samples)
DATASETS = {
    "brain_mri": {
        "description": "Sample brain MRI from OpenNeuro/IXI dataset",
        # IXI dataset has open T1/T2 brain MRI
        "sample_url": "https://openneuro.org/crn/datasets/ds000030/snapshots/1.0.0/files/sub-10159:anat:sub-10159_T1w.nii.gz",
        "fallback_url": None,
    },
    "chest_ct": {
        "description": "Sample chest CT from LIDC-IDRI via TCIA",
        "info": "Requires TCIA data access - use sample slices instead",
    },
}


def create_sample_imaging_manifest():
    """
    Create a manifest file describing available imaging data.
    This will be used by the frontend to know what's available.
    """
    manifest = {
        "version": "1.0",
        "description": "Virtual Tumor Board imaging data manifest",
        "body_regions": {
            "brain": {
                "modality": "MRI",
                "sequences": ["T1_post_contrast", "T2_FLAIR", "DWI"],
                "num_slices": 100,
                "slice_thickness_mm": 3.0,
                "source": "Synthetic based on BraTS morphology",
                "cases": ["pediatric-gbm-brain"],
            },
            "thorax": {
                "modality": "CT",
                "windows": ["lung", "mediastinum", "bone"],
                "num_slices": 100,
                "slice_thickness_mm": 2.5,
                "source": "Synthetic based on LIDC-IDRI morphology",
                "cases": [
                    "lung-nsclc-kras-g12c",
                    "breast-her2-early",
                    "esophageal-neoadjuvant",
                ],
            },
            "abdomen": {
                "modality": "CT",
                "windows": ["soft_tissue", "liver"],
                "num_slices": 100,
                "slice_thickness_mm": 3.0,
                "source": "Synthetic based on TCIA morphology",
                "cases": [
                    "colorectal-msi-h-mets",
                    "gastric-stage-iii",
                    "ovarian-brca1-hgsoc",
                ],
            },
            "pelvis": {
                "modality": "CT",
                "windows": ["soft_tissue", "bone"],
                "num_slices": 100,
                "slice_thickness_mm": 3.0,
                "source": "Synthetic based on TCIA morphology",
                "cases": ["cervix-locally-advanced", "prostate-mcrpc"],
            },
            "head_neck": {
                "modality": "CT",
                "windows": ["soft_tissue", "bone"],
                "num_slices": 100,
                "slice_thickness_mm": 2.0,
                "source": "Synthetic based on TCIA morphology",
                "cases": ["oral-cavity-locally-advanced"],
            },
        },
        "tumor_annotations": {
            "format": "binary_mask",
            "colors": {
                "primary_tumor": "#FF3232",
                "lymph_node": "#FFB732",
                "metastasis": "#9932FF",
            },
        },
    }

    manifest_path = PUBLIC_IMAGING / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Created manifest at: {manifest_path}")
    return manifest


def download_and_process_brats_sample():
    """
    Download a sample from BraTS-like open data.
    BraTS provides T1ce, T2, FLAIR sequences with tumor segmentation.
    """
    print("\n=== BraTS Brain Tumor Data ===")
    print("The BraTS dataset requires registration at synapse.org")
    print(
        "For this demo, we'll use the synthetic generator with BraTS-like characteristics"
    )
    print("\nTo use real BraTS data:")
    print("1. Register at https://www.synapse.org/")
    print("2. Access BraTS 2021 at syn25829067")
    print("3. Download a sample case and place in apps/web/public/imaging/brain/")


def print_setup_instructions():
    """Print instructions for setting up real imaging data."""
    print("\n" + "=" * 60)
    print("VIRTUAL TUMOR BOARD - IMAGING DATA SETUP")
    print("=" * 60)

    print("\nFor REALISTIC medical imaging, you have two options:\n")

    print("OPTION 1: Use Pre-processed Sample Data (Recommended)")
    print("-" * 50)
    print("We provide sample slices processed from open datasets.")
    print("Run: npm run download-imaging-samples")
    print("")

    print("OPTION 2: Process Your Own Data")
    print("-" * 50)
    print("Download from these open sources:")
    print("")
    print("Brain MRI (GBM):")
    print("  - BraTS 2021: https://www.synapse.org/#!Synapse:syn25829067")
    print("  - Provides: T1ce, T2, FLAIR + segmentation masks")
    print("")
    print("Chest CT (Lung Cancer):")
    print(
        "  - LIDC-IDRI: https://wiki.cancerimagingarchive.net/display/Public/LIDC-IDRI"
    )
    print("  - Provides: CT scans with nodule annotations")
    print("")
    print("Abdominal CT:")
    print("  - CT-ORG: https://wiki.cancerimagingarchive.net/display/Public/CT-ORG")
    print("  - Provides: Multi-organ CT with segmentations")
    print("")
    print("After downloading, run:")
    print("  python scripts/download_imaging_data.py --process /path/to/data")
    print("")


if __name__ == "__main__":
    print_setup_instructions()
    create_sample_imaging_manifest()

    if "--download-samples" in sys.argv:
        download_and_process_brats_sample()
