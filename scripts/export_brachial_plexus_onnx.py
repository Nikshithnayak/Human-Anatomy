"""Export the trained brachial-plexus SegFormer+ConvLSTM checkpoint to a single ONNX model.

Usage:
    python scripts/export_brachial_plexus_onnx.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
import torch.nn as nn
import yaml

ROOT = Path(__file__).resolve().parents[1]
BP_ROOT = ROOT / "external" / "brachial-plexus"
sys.path.insert(0, str(BP_ROOT))

from src.model import TemporalSegmentationModel  # noqa: E402
from src.utils import post_processing, replace_gelu_with_relu  # noqa: E402


class SingleFrameBrachialPlexusONNX(nn.Module):
    """Wraps TemporalSegmentationModel for single-frame grayscale B-mode inference.

    Input:  `frame` (`float32`, shape `[1, 1, 416, 416]`, grayscale normalized `0.0..1.0`)
    Output: `probs` (`float32`, shape `[1, 9, 416, 416]`, calibrated probabilities for
            `[BG, C5, C6, C7/MT, C8/LT, UT, SSN, AD, PD]`)
    """

    def __init__(self, base_model: TemporalSegmentationModel):
        super().__init__()
        self.base_model = base_model

    def forward(self, frame: torch.Tensor) -> torch.Tensor:
        seq = frame.unsqueeze(1)  # [B=1, T=1, C=1, H=416, W=416]
        logits_seq, _ = self.base_model(seq, hidden_state=None)
        return post_processing(logits_seq[:, 0])


def main() -> None:
    cfg_path = BP_ROOT / "lightning_logs" / "seq50" / "config.yaml"
    ckpt_path = BP_ROOT / "lightning_logs" / "seq50" / "checkpoints" / "last.ckpt"
    out_path = ROOT / "public" / "models" / "brachial-plexus.onnx"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    mcfg = dict(cfg["model"])
    model_kwargs = dict(mcfg.pop("model_kwargs", {}) or {})
    # Never fetch ImageNet weights over network — all parameters load from `last.ckpt`.
    model_kwargs["encoder_weights"] = None

    base_model = TemporalSegmentationModel(
        encoder_name=mcfg.get("encoder_name", "mit_b0"),
        segmentation_model_name=mcfg.get("segmentation_model_name", "Segformer"),
        num_classes=int(mcfg.get("num_classes", 8)),
        temporal_model=mcfg.get("temporal_model", "ConvLSTM"),
        num_layers=mcfg.get("num_layers", 1),
        encoder_depth=int(mcfg.get("encoder_depth", 5)),
        temporal_depth=int(mcfg.get("temporal_depth", 4)),
        kernel_size=tuple(mcfg.get("kernel_size", [3, 3])),
        dilation=int(mcfg.get("dilation", 1)),
        conv_type=mcfg.get("conv_type", "depthwise"),
        **model_kwargs,
    )

    if mcfg.get("use_relu", False):
        base_model = replace_gelu_with_relu(base_model)

    ckpt = torch.load(str(ckpt_path), map_location="cpu", weights_only=False)
    raw_state = ckpt.get("state_dict", ckpt)
    clean_state = {
        (k[len("model.") :] if k.startswith("model.") else k): v
        for k, v in raw_state.items()
        if k.startswith("model.")
    }
    missing, unexpected = base_model.load_state_dict(clean_state, strict=True)
    assert not missing and not unexpected, f"Mismatch loading checkpoint: {missing=} {unexpected=}"
    base_model.eval()

    wrapper = SingleFrameBrachialPlexusONNX(base_model).eval()

    # Deterministic synthetic B-mode-like test tensor in [0.0, 1.0].
    rng = np.random.default_rng(42)
    dummy_np = rng.uniform(0.05, 0.75, size=(1, 1, 416, 416)).astype(np.float32)
    # Paint dark hypoechoic circles resembling nerve fascicles around center.
    yy, xx = np.ogrid[:416, :416]
    for cy, cx, r in [(145, 200, 14), (185, 208, 16), (225, 205, 15)]:
        mask = (xx - cx) ** 2 + (yy - cy) ** 2 <= r ** 2
        dummy_np[0, 0, mask] = 0.08
    dummy_t = torch.from_numpy(dummy_np)

    with torch.no_grad():
        torch_out = wrapper(dummy_t).numpy()

    torch.onnx.export(
        wrapper,
        (dummy_t,),
        str(out_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["frame"],
        output_names=["probs"],
        dynamo=False,
    )

    # Ensure single-file self-contained ONNX if external data was created.
    proto = onnx.load(str(out_path))
    onnx.checker.check_model(proto)

    session = ort.InferenceSession(str(out_path), providers=["CPUExecutionProvider"])
    ort_out = session.run(["probs"], {"frame": dummy_np})[0]

    max_diff = float(np.max(np.abs(torch_out - ort_out)))
    mean_diff = float(np.mean(np.abs(torch_out - ort_out)))
    prob_sum_err = float(np.max(np.abs(np.sum(ort_out, axis=1) - 1.0)))

    print(f"[export] Wrote {out_path} ({out_path.stat().st_size / (1024 * 1024):.2f} MB)")
    print(f"[verify] PyTorch vs ONNX max_abs_diff={max_diff:.6e}, mean_diff={mean_diff:.6e}, sum_err={prob_sum_err:.6e}")
    assert np.isfinite(ort_out).all(), "Non-finite values in ONNX output!"
    assert max_diff < 1e-4, f"PyTorch vs ONNX numerical mismatch: {max_diff}"
    print("[verify] Numerical parity PASSED.")


if __name__ == "__main__":
    main()

