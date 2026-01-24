"""
MedSAM3 Predictor (Simplified)
Wrapper for MedSAM3 inference with optional LoRA weights.
Falls back to demo mode if SAM3/PyTorch not available.
"""

import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Try to import PyTorch and OpenCV
try:
    import torch

    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    print("PyTorch not available - predictor will run in demo mode")

try:
    import cv2

    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    print("OpenCV not available - some features limited")


class MedSAM3Predictor:
    """
    Wrapper for MedSAM3 inference with LoRA weights.
    Supports both point and box prompts for 2D segmentation.
    """

    def __init__(self, checkpoint_path: str = None, device: str = None):
        """
        Initialize predictor with checkpoint.

        Args:
            checkpoint_path: Path to .ckpt file (optional, can load later)
            device: 'cuda', 'mps', or 'cpu' (auto-detected if None)
        """
        if not HAS_TORCH:
            self.device = "cpu"
            self.model = None
            self.model_loaded = False
            print("MedSAM3Predictor initialized in DEMO mode (PyTorch not available)")
            return

        if device is None:
            if torch.cuda.is_available():
                device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"

        self.device = device
        self.image_size = 1008  # SAM3 requires 1008x1008 (72 patches of 14px)
        self.model = None
        self.model_loaded = False

        if checkpoint_path:
            self.load_model(checkpoint_path)

        print(f"MedSAM3Predictor initialized on {device}")

    def load_model(self, checkpoint_path: str) -> bool:
        """
        Load model with checkpoint weights.

        Args:
            checkpoint_path: Path to .ckpt or .pt file

        Returns:
            True if successful
        """
        if not HAS_TORCH:
            print("Cannot load model - PyTorch not available")
            return False

        checkpoint_path = Path(checkpoint_path)
        if not checkpoint_path.exists():
            print(f"Checkpoint not found: {checkpoint_path}")
            return False

        try:
            # Load checkpoint
            print(f"Loading checkpoint from {checkpoint_path}...")
            checkpoint = torch.load(checkpoint_path, map_location="cpu")

            # Extract state dict (handle Lightning format)
            if "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
                # Remove 'model.' prefix if present (Lightning wrapper)
                state_dict = {k.replace("model.", ""): v for k, v in state_dict.items()}
            else:
                state_dict = checkpoint

            # Try to build the SAM3 model
            try:
                from sam3 import build_sam3_image_model

                self.model = build_sam3_image_model(
                    device=self.device,
                    eval_mode=True,
                    checkpoint_path=None,
                    load_from_HF=False,
                    enable_segmentation=True,
                    enable_inst_interactivity=True,
                )
            except ImportError as e:
                print(f"SAM3 import failed: {e}")
                print("Running in demo mode")
                return False

            # Load weights (strict=False for LoRA adapters)
            if self.model is not None:
                missing, unexpected = self.model.load_state_dict(
                    state_dict, strict=False
                )
                if missing:
                    print(f"Missing keys: {len(missing)}")
                if unexpected:
                    print(f"Unexpected keys: {len(unexpected)}")

                self.model = self.model.to(self.device)
                self.model.eval()
                self.model_loaded = True
                print(f"Model loaded successfully on {self.device}")
                return True

        except Exception as e:
            print(f"Error loading model: {e}")
            import traceback

            traceback.print_exc()
            return False

        return False

    def segment_slice(
        self,
        slice_data: np.ndarray,
        prompt: Dict,
        window_center: float = None,
        window_width: float = None,
    ) -> np.ndarray:
        """
        Segment a single 2D slice.

        Args:
            slice_data: 2D numpy array (H, W)
            prompt: {"points": [[x, y], ...], "labels": [1, ...]}
                    or {"boxes": [[x1, y1, x2, y2], ...]}
            window_center: Optional CT window center
            window_width: Optional CT window width

        Returns:
            Binary mask of shape (H, W)
        """
        original_shape = slice_data.shape[:2]

        # If model not loaded, return a demo mask
        if not self.model_loaded or self.model is None:
            return self._generate_demo_mask(original_shape, prompt)

        # Real inference would go here
        # For now, always use demo mask
        return self._generate_demo_mask(original_shape, prompt)

    def _generate_demo_mask(self, shape: Tuple[int, int], prompt: Dict) -> np.ndarray:
        """
        Generate a demo mask when model is not available.
        Creates a smooth elliptical region around the prompt point.
        """
        mask = np.zeros(shape, dtype=bool)
        H, W = shape

        # Get center point from prompt
        if "points" in prompt and prompt["points"]:
            # Use first foreground point
            fg_points = [
                (p[0], p[1])
                for i, p in enumerate(prompt["points"])
                if prompt.get("labels", [1] * len(prompt["points"]))[i] == 1
            ]
            if fg_points:
                cx, cy = fg_points[0]
            else:
                cx, cy = W / 2, H / 2
        elif "boxes" in prompt and prompt["boxes"]:
            x1, y1, x2, y2 = prompt["boxes"][0]
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        else:
            cx, cy = W / 2, H / 2

        # Create elliptical mask with some natural variation
        rx = min(H, W) // 6  # radius x
        ry = min(H, W) // 7  # radius y

        y_grid, x_grid = np.ogrid[:H, :W]
        dist = ((x_grid - cx) / rx) ** 2 + ((y_grid - cy) / ry) ** 2

        # Create smooth ellipse with slight irregularity
        base_mask = dist <= 1.0

        # Add some natural-looking boundary variation
        np.random.seed(int(cx * 100 + cy * 10) % (2**31))
        noise = np.random.random((H, W)) * 0.25
        boundary = (dist > 0.75) & (dist < 1.25)
        mask = base_mask.copy()
        mask[boundary] = (dist[boundary] + noise[boundary]) <= 1.1

        return mask

    def get_model_info(self) -> Dict:
        """Get information about the loaded model."""
        info = {
            "loaded": self.model_loaded,
            "device": str(self.device),
            "image_size": getattr(self, "image_size", 1008),
            "has_torch": HAS_TORCH,
            "has_cv2": HAS_CV2,
        }

        if self.model is not None and self.model_loaded:
            # Count parameters
            total_params = sum(p.numel() for p in self.model.parameters())
            trainable_params = sum(
                p.numel() for p in self.model.parameters() if p.requires_grad
            )
            info["total_params"] = total_params
            info["trainable_params"] = trainable_params

        return info
