"""
Segmentation Service for Virtual Tumor Board
Provides AI-powered tumor segmentation using point/box prompts.

In demo mode (default), generates synthetic segmentation masks.
With MedSAM3 weights, provides real AI segmentation.
"""

import os
import io
import base64
import json
from typing import List, Optional, Tuple
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Try to import predictor (optional dependency)
try:
    from predictor import MedSAM3Predictor

    HAS_PREDICTOR = True
except ImportError:
    HAS_PREDICTOR = False
    print("MedSAM3Predictor not available - running in demo mode")


# Global predictor instance
predictor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    global predictor

    checkpoint_path = os.getenv("CHECKPOINT_PATH")

    if HAS_PREDICTOR and checkpoint_path and os.path.exists(checkpoint_path):
        print(f"Loading model from {checkpoint_path}...")
        predictor = MedSAM3Predictor(checkpoint_path)
    else:
        print("Running in demo mode (no model loaded)")
        predictor = None

    yield

    # Cleanup on shutdown
    predictor = None


app = FastAPI(
    title="VTB Segmentation Service",
    description="AI-powered tumor segmentation for Virtual Tumor Board",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Models ---


class PointPrompt(BaseModel):
    """Point prompt for segmentation."""

    x: float
    y: float
    label: int = 1  # 1 = foreground, 0 = background


class BoxPrompt(BaseModel):
    """Bounding box prompt for segmentation."""

    x1: float
    y1: float
    x2: float
    y2: float


class SegmentationRequest(BaseModel):
    """Request for segmenting a single slice."""

    slice_data: str  # Base64 encoded numpy array or image
    slice_shape: List[int]  # [height, width]
    points: Optional[List[PointPrompt]] = None
    boxes: Optional[List[BoxPrompt]] = None
    window_center: Optional[float] = None
    window_width: Optional[float] = None


class SegmentationResponse(BaseModel):
    """Response containing segmentation mask."""

    mask_rle: List[List[int]]  # Run-length encoded mask
    mask_shape: List[int]
    confidence: float
    contours: Optional[List[List[List[float]]]] = None  # Optional polygon contours


class PropagationRequest(BaseModel):
    """Request for propagating segmentation through slices."""

    case_id: str
    start_slice: int
    direction: str = "both"  # "forward", "backward", "both"
    initial_points: List[PointPrompt]
    max_slices: Optional[int] = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    model_loaded: bool
    mode: str


# --- Helper Functions ---


def decode_slice(data: str, shape: List[int]) -> np.ndarray:
    """Decode base64 slice data to numpy array."""
    try:
        decoded = base64.b64decode(data)
        arr = np.frombuffer(decoded, dtype=np.float32)
        return arr.reshape(shape)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode slice: {e}")


def mask_to_rle(mask: np.ndarray) -> List[List[int]]:
    """Convert binary mask to run-length encoding."""
    flat = mask.flatten().astype(np.uint8)

    if len(flat) == 0:
        return []

    # Find where values change
    changes = np.diff(flat)
    change_indices = np.where(changes != 0)[0] + 1

    # Build runs
    starts = np.concatenate([[0], change_indices])
    ends = np.concatenate([change_indices, [len(flat)]])

    rle = []
    for start, end in zip(starts, ends):
        value = int(flat[start])
        length = int(end - start)
        rle.append([value, length])

    return rle


def generate_demo_mask(
    shape: Tuple[int, int],
    points: Optional[List[PointPrompt]] = None,
    boxes: Optional[List[BoxPrompt]] = None,
) -> np.ndarray:
    """
    Generate a demo segmentation mask.
    Creates a circular or elliptical region based on prompts.
    """
    H, W = shape
    mask = np.zeros((H, W), dtype=bool)

    # Determine center and size from prompts
    if points and len(points) > 0:
        # Use first foreground point as center
        fg_points = [p for p in points if p.label == 1]
        if fg_points:
            cx = fg_points[0].x
            cy = fg_points[0].y
        else:
            cx, cy = W / 2, H / 2
    elif boxes and len(boxes) > 0:
        # Use box center
        box = boxes[0]
        cx = (box.x1 + box.x2) / 2
        cy = (box.y1 + box.y2) / 2
    else:
        cx, cy = W / 2, H / 2

    # Create elliptical mask with some noise for realism
    rx = min(W, H) // 6  # radius x
    ry = min(W, H) // 7  # radius y

    y_grid, x_grid = np.ogrid[:H, :W]
    dist = ((x_grid - cx) / rx) ** 2 + ((y_grid - cy) / ry) ** 2

    # Create smooth ellipse
    mask = dist <= 1.0

    # Add some irregularity using noise
    np.random.seed(int(cx * 100 + cy * 10))
    noise = np.random.random((H, W)) * 0.3
    boundary = (dist > 0.7) & (dist < 1.3)
    mask[boundary] = (dist[boundary] + noise[boundary]) <= 1.1

    return mask


def find_contours(mask: np.ndarray) -> List[List[List[float]]]:
    """Find contours in binary mask."""
    try:
        import cv2

        mask_uint8 = mask.astype(np.uint8) * 255
        contours, _ = cv2.findContours(
            mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        result = []
        for contour in contours:
            points = contour.squeeze().astype(float).tolist()
            if isinstance(points[0], list):  # Multiple points
                result.append(points)
            else:  # Single point - wrap it
                result.append([points])

        return result
    except ImportError:
        return []


# --- API Endpoints ---


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model_loaded=predictor is not None
        and getattr(predictor, "model_loaded", False),
        mode="production" if predictor else "demo",
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Alias for health check."""
    return await health_check()


@app.post("/segment", response_model=SegmentationResponse)
async def segment_slice(request: SegmentationRequest):
    """
    Segment a single 2D slice using point or box prompts.

    Returns run-length encoded mask for efficient transmission.
    """
    if not request.points and not request.boxes:
        raise HTTPException(status_code=400, detail="Must provide points or boxes")

    shape = tuple(request.slice_shape)

    if predictor is not None and getattr(predictor, "model_loaded", False):
        # Real segmentation with MedSAM3
        try:
            slice_data = decode_slice(request.slice_data, shape)

            # Build prompt dict
            prompt = {}
            if request.points:
                prompt["points"] = [[p.x, p.y] for p in request.points]
                prompt["labels"] = [p.label for p in request.points]
            if request.boxes:
                prompt["boxes"] = [[b.x1, b.y1, b.x2, b.y2] for b in request.boxes]

            mask = predictor.segment_slice(
                slice_data, prompt, request.window_center, request.window_width
            )
            confidence = 0.85  # Real model confidence would come from IoU prediction
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Segmentation failed: {e}")
    else:
        # Demo mode - generate synthetic mask
        mask = generate_demo_mask(shape, request.points, request.boxes)
        confidence = 0.75  # Demo confidence

    # Convert to RLE
    rle = mask_to_rle(mask)

    # Find contours
    contours = find_contours(mask)

    return SegmentationResponse(
        mask_rle=rle,
        mask_shape=list(mask.shape),
        confidence=confidence,
        contours=contours,
    )


@app.post("/propagate")
async def propagate_segmentation(request: PropagationRequest):
    """
    Propagate segmentation through volume slices.

    This is a placeholder - actual implementation would need
    access to the volume data, likely via a file reference or streaming.
    """
    return {
        "status": "not_implemented",
        "message": "Volume propagation requires access to the full volume. "
        "Use the /segment endpoint for individual slices.",
        "hint": "For 3D propagation, the frontend should iterate through slices "
        "using the previous mask centroid as the next prompt.",
    }


@app.get("/model-info")
async def model_info():
    """Get information about the loaded model."""
    if predictor is not None:
        return predictor.get_model_info()
    return {
        "loaded": False,
        "mode": "demo",
        "description": "Running in demo mode - generating synthetic masks",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
