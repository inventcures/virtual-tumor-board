"""
OncoSeg API - 3D Tumor Segmentation for Medical Imaging
HuggingFace Space: tp53/oncoseg-api

This provides a Gradio API for 3D tumor segmentation using the OncoSeg model.
Accepts NIfTI files and returns segmentation masks.

FIX: Returns JSON as string to avoid Gradio schema issues with nested dicts.
"""

import gradio as gr
import numpy as np
import json
import base64
import gzip
from typing import Optional
import os

# Model loading (lazy)
model = None
model_name = "default"


def load_model(checkpoint: str = "default"):
    """Load the segmentation model (stub - replace with actual model loading)"""
    global model, model_name

    # In production, load actual OncoSeg model here
    # For now, return a stub that generates demo segmentation
    model_name = checkpoint
    model = "loaded"

    return f"Model '{checkpoint}' loaded"


def segment_nifti(
    nifti_base64: str, checkpoint: str = "default", threshold: float = 0.5
) -> str:
    """
    Segment a 3D NIfTI volume.

    Args:
        nifti_base64: Base64-encoded gzipped NIfTI file
        checkpoint: Model checkpoint to use
        threshold: Segmentation threshold (0-1)

    Returns:
        JSON string with segmentation results (NOT dict - Gradio compatibility)
    """
    global model, model_name

    try:
        # Load model if needed
        if model is None or model_name != checkpoint:
            load_model(checkpoint)

        # Decode the NIfTI file
        nifti_bytes = base64.b64decode(nifti_base64)

        # Check if gzipped
        if nifti_bytes[:2] == b"\x1f\x8b":
            nifti_bytes = gzip.decompress(nifti_bytes)

        # Parse NIfTI header to get dimensions
        # NIfTI-1 header: dims at offset 40, 8 int16 values
        # dim[0] = number of dimensions, dim[1-7] = sizes
        import struct

        # Check for NIfTI magic number
        magic = nifti_bytes[344:348]
        if magic not in [b"n+1\x00", b"ni1\x00"]:
            # Try as raw volume (assume 64x64x64 for demo)
            shape = (64, 64, 64)
        else:
            dims = struct.unpack("<8h", nifti_bytes[40:56])
            ndim = dims[0]
            shape = tuple(dims[1 : ndim + 1])

        # Generate segmentation mask
        # In production, run actual model inference here
        mask = generate_demo_mask(shape, threshold)

        # Encode mask as base64 for transmission
        mask_bytes = mask.astype(np.uint8).tobytes()
        mask_compressed = gzip.compress(mask_bytes)
        mask_base64 = base64.b64encode(mask_compressed).decode("utf-8")

        # Calculate tumor statistics
        tumor_voxels = int(np.sum(mask > 0))
        total_voxels = int(np.prod(shape))
        tumor_percentage = (
            (tumor_voxels / total_voxels) * 100 if total_voxels > 0 else 0
        )

        # Find bounding box of tumor
        if tumor_voxels > 0:
            coords = np.where(mask > 0)
            bbox = {
                "min": [int(c.min()) for c in coords],
                "max": [int(c.max()) for c in coords],
            }
        else:
            bbox = None

        result = {
            "success": True,
            "shape": list(shape),
            "mask_base64": mask_base64,
            "mask_dtype": "uint8",
            "statistics": {
                "tumor_voxels": tumor_voxels,
                "total_voxels": total_voxels,
                "tumor_percentage": round(tumor_percentage, 2),
                "bounding_box": bbox,
            },
            "model": checkpoint,
            "threshold": threshold,
        }

        # IMPORTANT: Return as JSON string, not dict
        # This fixes Gradio's JSON schema validation issues
        return json.dumps(result)

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
        }
        return json.dumps(error_result)


def generate_demo_mask(shape: tuple, threshold: float = 0.5) -> np.ndarray:
    """
    Generate a demo segmentation mask (ellipsoid tumor).
    Replace this with actual model inference in production.
    """
    # Create coordinate grids
    z, y, x = np.ogrid[: shape[0], : shape[1], : shape[2]]

    # Center of the volume
    cz, cy, cx = shape[0] // 2, shape[1] // 2, shape[2] // 2

    # Ellipsoid radii (tumor size ~15-25% of volume)
    rz = shape[0] * 0.15
    ry = shape[1] * 0.18
    rx = shape[2] * 0.20

    # Create ellipsoid mask
    distance = ((z - cz) / rz) ** 2 + ((y - cy) / ry) ** 2 + ((x - cx) / rx) ** 2
    mask = (distance <= 1.0).astype(np.uint8)

    # Add some irregularity
    np.random.seed(42)  # Reproducible
    noise = np.random.rand(*shape) * 0.3
    mask = ((distance <= 1.0 + noise * 0.5) & (distance <= 1.3)).astype(np.uint8)

    return mask


def get_available_checkpoints() -> str:
    """
    Get list of available model checkpoints.

    Returns:
        JSON string with checkpoint list
    """
    checkpoints = {
        "checkpoints": [
            {
                "id": "default",
                "name": "OncoSeg Default",
                "description": "General purpose tumor segmentation",
                "modalities": ["CT", "MRI"],
            },
            {
                "id": "liver",
                "name": "OncoSeg Liver",
                "description": "Optimized for liver tumors",
                "modalities": ["CT"],
            },
            {
                "id": "brain",
                "name": "OncoSeg Brain",
                "description": "Optimized for brain tumors",
                "modalities": ["MRI"],
            },
            {
                "id": "lung",
                "name": "OncoSeg Lung",
                "description": "Optimized for lung nodules",
                "modalities": ["CT"],
            },
        ]
    }
    return json.dumps(checkpoints)


def health_check() -> str:
    """Health check endpoint"""
    return json.dumps(
        {
            "status": "healthy",
            "model_loaded": model is not None,
            "model_name": model_name,
        }
    )


# Create Gradio interface
with gr.Blocks(title="OncoSeg API") as demo:
    gr.Markdown("""
    # OncoSeg API - 3D Tumor Segmentation
    
    This API provides 3D tumor segmentation for medical imaging (NIfTI format).
    
    ## API Endpoints
    
    Use the Gradio API client to call these functions:
    
    - `segment_nifti(nifti_base64, checkpoint, threshold)` - Segment a NIfTI volume
    - `get_available_checkpoints()` - List available model checkpoints
    - `health_check()` - Check API health
    
    ## Usage Example (Python)
    
    ```python
    from gradio_client import Client
    import base64
    import json
    
    client = Client("tp53/oncoseg-api")
    
    # Load and encode NIfTI file
    with open("scan.nii.gz", "rb") as f:
        nifti_b64 = base64.b64encode(f.read()).decode()
    
    # Call segmentation
    result_str = client.predict(
        nifti_base64=nifti_b64,
        checkpoint="default",
        threshold=0.5,
        api_name="/segment_nifti"
    )
    
    # Parse result (returns JSON string)
    result = json.loads(result_str)
    print(f"Tumor: {result['statistics']['tumor_percentage']:.1f}%")
    ```
    """)

    with gr.Tab("Segment"):
        with gr.Row():
            with gr.Column():
                nifti_input = gr.Textbox(
                    label="NIfTI Base64",
                    placeholder="Base64-encoded NIfTI file",
                    lines=3,
                )
                checkpoint_input = gr.Dropdown(
                    choices=["default", "liver", "brain", "lung"],
                    value="default",
                    label="Model Checkpoint",
                )
                threshold_input = gr.Slider(
                    minimum=0.1, maximum=0.9, value=0.5, step=0.1, label="Threshold"
                )
                segment_btn = gr.Button("Segment", variant="primary")

            with gr.Column():
                output = gr.Textbox(label="Result (JSON)", lines=10)

        segment_btn.click(
            fn=segment_nifti,
            inputs=[nifti_input, checkpoint_input, threshold_input],
            outputs=output,
        )

    with gr.Tab("Checkpoints"):
        checkpoints_btn = gr.Button("Get Checkpoints")
        checkpoints_output = gr.Textbox(label="Available Checkpoints", lines=10)
        checkpoints_btn.click(fn=get_available_checkpoints, outputs=checkpoints_output)

    with gr.Tab("Health"):
        health_btn = gr.Button("Health Check")
        health_output = gr.Textbox(label="Status", lines=3)
        health_btn.click(fn=health_check, outputs=health_output)


# Launch
if __name__ == "__main__":
    demo.launch()
