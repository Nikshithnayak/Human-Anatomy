"""Brachial plexus ultrasound nerve inference service.

Supports:
  1. Real ONNX Runtime segmentation inference (`--image <path>`) using
     `public/models/brachial-plexus.onnx` exported from the trained
     SegFormer (`mit_b0`) + ConvLSTM checkpoint (`seq50/checkpoints/last.ckpt`).
  2. Anatomical reference projection (`--reference`) mapping the 8 model classes
     (`C5, C6, C7/MT, C8/LT, UT, SSN, AD, PD`) onto interactive 3D atlas coordinates.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_ONNX_PATH = REPO_ROOT / "public" / "models" / "brachial-plexus.onnx"
MODEL_INPUT_SIZE = 416

# Exact post-collapse model class ordering from
# `external/brachial-plexus/data/visualization/_overlay.py`
CLASS_NAMES = ["BG", "C5", "C6", "C7/MT", "C8/LT", "UT", "SSN", "AD", "PD"]

CLASS_DESCRIPTORS: dict[str, dict[str, Any]] = {
    "C5": {
        "label": "C5 Ventral Ramus",
        "type": "root",
        "position_3d": [-0.36, 1.05, 0.05],
        "normal_csa_mm2": [4.5, 9.5],
        "clinical_note": "Most superficial cervical root in interscalene groove; vulnerable in Erb-Duchenne traction.",
    },
    "C6": {
        "label": "C6 Ventral Ramus",
        "type": "root",
        "position_3d": [-0.38, 0.72, 0.02],
        "normal_csa_mm2": [7.0, 14.0],
        "clinical_note": "Bifid/double-fascicle ultrasonic appearance deep to C5 between anterior & middle scalene.",
    },
    "C7/MT": {
        "label": "C7 Root / Middle Trunk",
        "type": "trunk",
        "position_3d": [-0.35, 0.36, 0.0],
        "normal_csa_mm2": [8.0, 16.5],
        "clinical_note": "Traverses C7 transverse process lacking an anterior tubercle before forming Middle Trunk.",
    },
    "C8/LT": {
        "label": "C8 Root / Lower Trunk",
        "type": "trunk",
        "position_3d": [-0.3, 0.0, -0.04],
        "normal_csa_mm2": [6.0, 13.5],
        "clinical_note": "Course immediately superior to first rib & posterior to subclavian artery ('corner pocket').",
    },
    "UT": {
        "label": "Upper Trunk (C5-C6 Union)",
        "type": "trunk",
        "position_3d": [-0.58, 0.85, 0.04],
        "normal_csa_mm2": [10.0, 22.0],
        "clinical_note": "Target of selective Upper Trunk block; bifurcation gives off Suprascapular Nerve (SSN).",
    },
    "SSN": {
        "label": "Suprascapular Nerve",
        "type": "branch",
        "position_3d": [-0.74, 0.96, -0.14],
        "normal_csa_mm2": [2.2, 6.5],
        "clinical_note": "Exits posterolaterally off Upper Trunk under omohyoid toward suprascapular notch.",
    },
    "AD": {
        "label": "Anterior Division",
        "type": "division",
        "position_3d": [-0.95, 0.52, 0.08],
        "normal_csa_mm2": [3.5, 9.5],
        "clinical_note": "Ventral compartment contributing to lateral & medial cords inside supraclavicular cluster.",
    },
    "PD": {
        "label": "Posterior Division",
        "type": "division",
        "position_3d": [-0.98, 0.45, -0.1],
        "normal_csa_mm2": [4.0, 11.0],
        "clinical_note": "Dorsal divisions converging from all three trunks to form Posterior Cord.",
    },
}


def classify_morphology(
    csa_mm2: float, flattening_ratio: float, normal_range: list[float]
) -> tuple[str, str]:
    lo, hi = normal_range
    if csa_mm2 > hi * 1.15:
        return (
            "swollen",
            f"CSA {csa_mm2:.1f} mm2 exceeds upper reference ({hi:.1f} mm2) — consistent with edema/traction swelling.",
        )
    if flattening_ratio >= 2.6 and csa_mm2 >= lo * 0.65:
        return (
            "compressed",
            f"Oblong aspect ratio {flattening_ratio:.2f}:1 suggests focal scalene/fascial entrapment.",
        )
    if csa_mm2 < lo * 0.55:
        return (
            "hypoplastic",
            f"Caliber {csa_mm2:.1f} mm2 below reference floor ({lo:.1f} mm2) — evaluate partial slice/atrophy.",
        )
    return (
        "normal",
        f"CSA {csa_mm2:.1f} mm2 and aspect {flattening_ratio:.2f}:1 within normal limits.",
    )


def run_onnx_inference(
    image_path: Path, depth_cm: float = 4.0, min_prob: float = 0.25, min_pixels: int = 12
) -> dict[str, Any]:
    import onnxruntime as ort

    if not MODEL_ONNX_PATH.exists():
        raise FileNotFoundError(
            f"ONNX weights missing at {MODEL_ONNX_PATH}. Run `scripts/export_brachial_plexus_onnx.py` first."
        )

    t0 = time.perf_counter()
    with Image.open(image_path) as im:
        gray = im.convert("L").resize(
            (MODEL_INPUT_SIZE, MODEL_INPUT_SIZE), Image.Resampling.BILINEAR
        )
    arr = (np.asarray(gray, dtype=np.float32) / 255.0)[None, None, :, :]

    session = ort.InferenceSession(
        str(MODEL_ONNX_PATH), providers=["CPUExecutionProvider"]
    )
    probs = session.run(["probs"], {"frame": arr})[0][0]  # [9, 416, 416]
    infer_ms = (time.perf_counter() - t0) * 1000.0

    best_cls = np.argmax(probs, axis=0)  # [416, 416]
    best_val = np.take_along_axis(probs, best_cls[None, :, :], axis=0)[0]
    active_mask = (best_cls > 0) & (best_val >= min_prob)

    mm_per_px = (max(1.0, depth_cm) * 10.0) / MODEL_INPUT_SIZE
    px_area_mm2 = mm_per_px * mm_per_px

    detections: list[dict[str, Any]] = []
    for cls_id in range(1, len(CLASS_NAMES)):
        mask = active_mask & (best_cls == cls_id)
        pixel_count = int(np.count_nonzero(mask))
        if pixel_count < min_pixels:
            continue

        ys, xs = np.nonzero(mask)
        cx = float(np.mean(xs))
        cy = float(np.mean(ys))
        mu20 = max(0.25, float(np.mean((xs - cx) ** 2)))
        mu02 = max(0.25, float(np.mean((ys - cy) ** 2)))
        mu11 = float(np.mean((xs - cx) * (ys - cy)))
        trace = mu20 + mu02
        disc = math.sqrt((mu20 - mu02) ** 2 + 4.0 * mu11 * mu11)
        lambda1 = max(0.25, 0.5 * (trace + disc))
        lambda2 = max(0.25, 0.5 * (trace - disc))

        major_mm = 4.0 * math.sqrt(lambda1) * mm_per_px
        minor_mm = 4.0 * math.sqrt(lambda2) * mm_per_px
        flattening = major_mm / max(minor_mm, 0.05)
        csa_mm2 = pixel_count * px_area_mm2

        code = CLASS_NAMES[cls_id]
        meta = CLASS_DESCRIPTORS[code]
        status, finding = classify_morphology(csa_mm2, flattening, meta["normal_csa_mm2"])
        conf_vals = best_val[mask]

        detections.append(
            {
                "class_id": cls_id,
                "name": code,
                "label": meta["label"],
                "type": meta["type"],
                "pixel_count": pixel_count,
                "mean_confidence": round(float(np.mean(conf_vals)), 4),
                "peak_confidence": round(float(np.max(conf_vals)), 4),
                "centroid_px": [round(cx, 1), round(cy, 1)],
                "bbox_px": [
                    int(xs.min()),
                    int(ys.min()),
                    int(xs.max()),
                    int(ys.max()),
                ],
                "csa_mm2": round(csa_mm2, 2),
                "major_axis_mm": round(major_mm, 2),
                "minor_axis_mm": round(minor_mm, 2),
                "flattening_ratio": round(flattening, 2),
                "normal_csa_mm2": meta["normal_csa_mm2"],
                "status": status,
                "finding": finding,
                "position_3d": meta["position_3d"],
                "clinical_note": meta["clinical_note"],
            }
        )

    detections.sort(key=lambda d: d["pixel_count"], reverse=True)
    return {
        "model": "SegFormer-mit_b0-ConvLSTM (brachial-plexus.onnx)",
        "mode": "onnx_inference",
        "image_size": [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE],
        "depth_cm": depth_cm,
        "inference_ms": round(infer_ms, 2),
        "classes": CLASS_NAMES[1:],
        "detections": detections,
        "has_high_confidence_detection": any(
            d["peak_confidence"] >= 0.4 for d in detections
        ),
        "source": "public/models/brachial-plexus.onnx",
    }


def get_reference_predictions() -> dict[str, Any]:
    structures = []
    for idx, code in enumerate(CLASS_NAMES[1:], start=1):
        meta = CLASS_DESCRIPTORS[code]
        structures.append(
            {
                "class_id": idx,
                "name": code,
                "label": meta["label"],
                "type": meta["type"],
                "position_3d": meta["position_3d"],
                "normal_csa_mm2": meta["normal_csa_mm2"],
                "clinical_note": meta["clinical_note"],
            }
        )
    return {
        "model": "SegFormer-mit_b0-ConvLSTM (seq50)",
        "mode": "reference_atlas",
        "image_size": [MODEL_INPUT_SIZE, MODEL_INPUT_SIZE],
        "classes": CLASS_NAMES[1:],
        "onnx_ready": MODEL_ONNX_PATH.exists(),
        "structures": structures,
        "source": "external/brachial-plexus",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Brachial plexus ultrasound nerve inference service")
    parser.add_argument("--image", type=Path, help="Input ultrasound image file (.png/.jpg)")
    parser.add_argument("--depth-cm", type=float, default=4.0, help="Ultrasound scanning depth (cm)")
    parser.add_argument("--reference", action="store_true", help="Output interscalene 3D atlas metadata")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    args = parser.parse_args()

    if args.image and args.image.exists():
        result = run_onnx_inference(args.image, depth_cm=args.depth_cm)
    else:
        result = get_reference_predictions()

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Mode: {result['mode']} | Model: {result['model']}")


if __name__ == "__main__":
    main()
