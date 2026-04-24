# modules/preprocessor.py

import cv2
import numpy as np
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional
import json


# ── Output schema ─────────────────────────────────────────────────────────────

@dataclass
class ColorStats:
    mean_r: float
    mean_g: float
    mean_b: float
    std_r: float
    std_g: float
    std_b: float
    dominant_hue: float          # 0–360
    saturation_mean: float       # 0–1
    value_mean: float            # 0–1 (brightness in HSV)


@dataclass
class PreprocessMetadata:
    # File info
    original_path: str
    original_width: int
    original_height: int
    original_format: str
    aspect_ratio: float

    # Processed image info
    processed_width: int
    processed_height: int
    pad_top: int
    pad_bottom: int
    pad_left: int
    pad_right: int

    # Pixel stats
    mean_brightness: float       # 0–255
    global_contrast: float       # std of grayscale
    color: ColorStats

    # Histogram peaks (top 3 hue bins, 0–360)
    dominant_hues: list[float]

    # For downstream: the actual processed image (not serialized to JSON)
    _image_bgr: Optional[np.ndarray] = None
    _image_rgb: Optional[np.ndarray] = None
    _image_gray: Optional[np.ndarray] = None

    def to_dict(self) -> dict:
        """Return JSON-serializable dict (excludes image arrays)."""
        d = asdict(self)
        d.pop("_image_bgr", None)
        d.pop("_image_rgb", None)
        d.pop("_image_gray", None)
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


# ── Config ─────────────────────────────────────────────────────────────────────

TARGET_SIZE = 1024          # square canvas size
BILATERAL_D = 9             # bilateral filter diameter
BILATERAL_SIGMA_COLOR = 75
BILATERAL_SIGMA_SPACE = 75
SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}


# ── Core functions ─────────────────────────────────────────────────────────────

def validate_image(path: str | Path) -> Path:
    """Raise ValueError on unsupported format or unreadable file."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    if p.suffix.lower() not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported format '{p.suffix}'. "
            f"Accepted: {', '.join(SUPPORTED_FORMATS)}"
        )
    img = cv2.imread(str(p))
    if img is None:
        raise ValueError(f"OpenCV could not decode image: {path}")
    return p


def letterbox_resize(
    img: np.ndarray,
    target: int = TARGET_SIZE,
) -> tuple[np.ndarray, dict]:
    """
    Resize image to fit inside a (target × target) canvas while preserving
    aspect ratio. Pad with black on the shorter axis.

    Returns:
        padded_img  — uint8 BGR, shape (target, target, 3)
        pad_info    — dict with pad_top, pad_bottom, pad_left, pad_right
    """
    h, w = img.shape[:2]
    scale = target / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)

    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    pad_top    = (target - new_h) // 2
    pad_bottom = target - new_h - pad_top
    pad_left   = (target - new_w) // 2
    pad_right  = target - new_w - pad_left

    padded = cv2.copyMakeBorder(
        resized,
        pad_top, pad_bottom, pad_left, pad_right,
        cv2.BORDER_CONSTANT,
        value=(0, 0, 0),
    )
    return padded, {
        "pad_top": pad_top,
        "pad_bottom": pad_bottom,
        "pad_left": pad_left,
        "pad_right": pad_right,
    }


def reduce_noise(img: np.ndarray) -> np.ndarray:
    """
    Apply bilateral filter — preserves edges while smoothing flat regions.
    Preferred over Gaussian for vision tasks because it doesn't blur edges
    that matter for the physics analyzer downstream.
    """
    return cv2.bilateralFilter(
        img,
        BILATERAL_D,
        BILATERAL_SIGMA_COLOR,
        BILATERAL_SIGMA_SPACE,
    )


def normalize_to_float(img: np.ndarray) -> np.ndarray:
    """Convert uint8 BGR image to float32 in [0, 1]."""
    return img.astype(np.float32) / 255.0


def analyze_color_histogram(img_bgr: np.ndarray) -> tuple[ColorStats, list[float]]:
    """
    Compute per-channel RGB stats and HSV-based color distribution.

    Returns:
        color_stats     — ColorStats dataclass
        dominant_hues   — top 3 hue values (0–360) by histogram peak
    """
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # Per-channel RGB stats
    r, g, b = img_rgb[:, :, 0], img_rgb[:, :, 1], img_rgb[:, :, 2]
    stats = ColorStats(
        mean_r=float(r.mean()),
        mean_g=float(g.mean()),
        mean_b=float(b.mean()),
        std_r=float(r.std()),
        std_g=float(g.std()),
        std_b=float(b.std()),
        dominant_hue=float(img_hsv[:, :, 0].mean()) * 2,  # OpenCV H is 0–180 → scale to 0–360
        saturation_mean=float(img_hsv[:, :, 1].mean()) / 255.0,
        value_mean=float(img_hsv[:, :, 2].mean()) / 255.0,
    )

    # Hue histogram (36 bins → 10° each)
    hue_channel = img_hsv[:, :, 0]
    hist = cv2.calcHist([hue_channel], [0], None, [36], [0, 180])
    hist = hist.flatten()

    # Pick top 3 peaks, convert to 0–360 degrees
    top3_bins = np.argsort(hist)[::-1][:3]
    dominant_hues = [float(b * 10) for b in top3_bins]   # bin → degrees (×10 for 10°/bin)

    return stats, dominant_hues


# ── Public API ─────────────────────────────────────────────────────────────────

def preprocess(image_path: str | Path) -> PreprocessMetadata:
    """
    Full preprocessing pipeline for one image.

    Steps:
        1. Validate format and readability
        2. Load original metadata
        3. Letterbox resize to TARGET_SIZE × TARGET_SIZE
        4. Bilateral noise reduction
        5. Grayscale + brightness stats
        6. Color histogram analysis
        7. Return PreprocessMetadata (includes image arrays for downstream)

    Args:
        image_path: path to the input image

    Returns:
        PreprocessMetadata with all stats + image arrays attached
    """
    # 1. Validate
    p = validate_image(image_path)

    # 2. Load
    img_orig = cv2.imread(str(p))
    orig_h, orig_w = img_orig.shape[:2]
    suffix = p.suffix.lower().lstrip(".")

    # 3. Resize (letterbox)
    img_resized, pad_info = letterbox_resize(img_orig, TARGET_SIZE)

    # 4. Denoise
    img_denoised = reduce_noise(img_resized)

    # 5. Grayscale stats
    gray = cv2.cvtColor(img_denoised, cv2.COLOR_BGR2GRAY)
    mean_brightness = float(gray.mean())
    global_contrast  = float(gray.std())

    # 6. Color histogram
    color_stats, dominant_hues = analyze_color_histogram(img_denoised)

    # 7. Build metadata
    return PreprocessMetadata(
        original_path=str(p.resolve()),
        original_width=orig_w,
        original_height=orig_h,
        original_format=suffix,
        aspect_ratio=round(orig_w / orig_h, 4),

        processed_width=TARGET_SIZE,
        processed_height=TARGET_SIZE,
        **pad_info,

        mean_brightness=round(mean_brightness, 2),
        global_contrast=round(global_contrast, 2),
        color=color_stats,
        dominant_hues=dominant_hues,

        # Attach images for downstream modules (not serialized)
        _image_bgr=img_denoised,
        _image_rgb=cv2.cvtColor(img_denoised, cv2.COLOR_BGR2RGB),
        _image_gray=gray,
    )