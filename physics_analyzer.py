# modules/physics_analyzer.py

import cv2
import numpy as np
from dataclasses import dataclass
import json
from modules.preprocessors import PreprocessMetadata


# ── Output schema ──────────────────────────────────────────────────────────────

@dataclass
class PhysicsMetadata:
    # Brightness
    mean_brightness: float          # 0–255
    brightness_class: str           # "high-key" | "mid-key" | "low-key"

    # Sharpness / Depth-of-field
    sharpness_score: float          # Laplacian variance (higher = sharper)
    dof_class: str                  # "shallow" | "moderate" | "deep"

    # Shadow
    shadow_hardness: str            # "hard" | "soft" | "diffuse"
    shadow_score: float             # raw gradient magnitude mean

    # Light direction
    light_direction: str            # "top-left" | "top-right" | "top" | "left" | "right" | "flat"
    light_x_norm: float             # -1.0 (left) to +1.0 (right)
    light_y_norm: float             # -1.0 (top) to +1.0 (bottom)

    # Edge density
    edge_density: float             # 0.0–1.0 ratio of edge pixels

    # Contrast
    contrast_ratio: float           # P95 / P5 luminance ratio

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items()}

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


# ── Thresholds (tune these for your target images) ────────────────────────────

BRIGHTNESS_HIGH_KEY   = 170   # above this → high-key
BRIGHTNESS_LOW_KEY    = 85    # below this → low-key

SHARPNESS_SHARP       = 300   # above → deep focus / sharp
SHARPNESS_SOFT        = 80    # below → shallow DoF / soft

SHADOW_HARD           = 12.0  # gradient mean above this → hard shadows
SHADOW_SOFT           = 5.0   # below this → diffuse / flat light

CANNY_LOW             = 50
CANNY_HIGH            = 150


# ── Feature extractors ────────────────────────────────────────────────────────

def classify_brightness(gray: np.ndarray) -> tuple[float, str]:
    mean = float(gray.mean())
    if mean >= BRIGHTNESS_HIGH_KEY:
        label = "high-key"
    elif mean <= BRIGHTNESS_LOW_KEY:
        label = "low-key"
    else:
        label = "mid-key"
    return round(mean, 2), label


def estimate_sharpness(gray: np.ndarray) -> tuple[float, str]:
    """
    Laplacian variance: high variance = lots of sharp edges = deep focus.
    Low variance = blurry / shallow depth-of-field.
    """
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    score = float(laplacian.var())
    if score >= SHARPNESS_SHARP:
        dof_class = "deep"
    elif score <= SHARPNESS_SOFT:
        dof_class = "shallow"
    else:
        dof_class = "moderate"
    return round(score, 2), dof_class


def estimate_shadow_hardness(gray: np.ndarray) -> tuple[str, float]:
    """
    Hard shadows = sharp, high-contrast shadow edges.
    Measure via Sobel gradient magnitude mean.
    High magnitude → hard light source (sun, bare bulb).
    Low magnitude  → soft / diffuse (overcast, softbox).
    """
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
    score = float(magnitude.mean())

    if score >= SHADOW_HARD:
        hardness = "hard"
    elif score <= SHADOW_SOFT:
        hardness = "diffuse"
    else:
        hardness = "soft"
    return hardness, round(score, 2)


def estimate_light_direction(gray: np.ndarray) -> tuple[str, float, float]:
    """
    Find the centroid of the brightest 10% of pixels.
    The light source is assumed to be in the direction of that centroid
    relative to image center.
    """
    h, w = gray.shape
    threshold = np.percentile(gray, 90)
    bright_mask = (gray >= threshold).astype(np.uint8)

    moments = cv2.moments(bright_mask)
    if moments["m00"] == 0:
        return "flat", 0.0, 0.0

    cx = moments["m10"] / moments["m00"]
    cy = moments["m01"] / moments["m00"]

    # Normalize to [-1, 1] relative to center
    norm_x = round((cx - w / 2) / (w / 2), 3)
    norm_y = round((cy - h / 2) / (h / 2), 3)

    # Map to compass label
    if abs(norm_x) < 0.2 and abs(norm_y) < 0.2:
        direction = "flat"
    elif abs(norm_x) < 0.25:
        direction = "top" if norm_y < 0 else "bottom"
    elif abs(norm_y) < 0.25:
        direction = "left" if norm_x < 0 else "right"
    elif norm_x < 0:
        direction = "top-left" if norm_y < 0 else "bottom-left"
    else:
        direction = "top-right" if norm_y < 0 else "bottom-right"

    return direction, norm_x, norm_y


def compute_edge_density(gray: np.ndarray) -> float:
    """
    Ratio of Canny edge pixels to total pixels.
    High density → busy/detailed composition.
    Low density  → minimalist / clean composition.
    """
    edges = cv2.Canny(gray, CANNY_LOW, CANNY_HIGH)
    density = float(np.count_nonzero(edges)) / (gray.shape[0] * gray.shape[1])
    return round(density, 4)


def get_content_region(gray: np.ndarray, meta) -> np.ndarray:
    """Slice out the letterbox padding so stats reflect actual image content."""
    return gray[
        meta.pad_top : gray.shape[0] - meta.pad_bottom,
        meta.pad_left : gray.shape[1] - meta.pad_right,
    ]


# ── Public API ─────────────────────────────────────────────────────────────────

def analyze_physics(meta: PreprocessMetadata) -> PhysicsMetadata:
    gray         = meta._image_gray
    gray_content = get_content_region(gray, meta)   # padding-free

    brightness, brightness_class      = classify_brightness(gray_content)
    sharpness, dof_class              = estimate_sharpness(gray_content)
    shadow_hardness, shadow_score     = estimate_shadow_hardness(gray_content)
    light_dir, light_x, light_y      = estimate_light_direction(gray_content)
    edge_density                      = compute_edge_density(gray_content)
    p95 = float(np.percentile(gray_content, 95))
    p5 = float(np.percentile(gray_content, 5))
    contrast_ratio = round(p95 / (p5 + 1e-5), 2)
   
    return PhysicsMetadata(
        mean_brightness   = brightness,
        brightness_class  = brightness_class,
        sharpness_score   = sharpness,
        dof_class         = dof_class,
        shadow_hardness   = shadow_hardness,
        shadow_score      = shadow_score,
        light_direction   = light_dir,
        light_x_norm      = light_x,
        light_y_norm      = light_y,
        edge_density      = edge_density,
        contrast_ratio    = contrast_ratio,
    )