import { NextResponse } from "next/server";
import { BRACHIAL_PLEXUS_CLASSES } from "@/lib/imaging/external-models";
import { BRACHIAL_PLEXUS_MODEL_CLASSES } from "@/lib/imaging/nerve-biometrics";

export { BRACHIAL_PLEXUS_CLASSES };

/**
 * Edge-safe metadata endpoint describing the deployed ONNX Runtime Web
 * brachial plexus segmentation model and anatomical landmarks.
 * Real neural inference executes client-side via `onnxruntime-web` on
 * `/models/brachial-plexus.onnx` (or CLI via `services/nerve_explorer/run_inference.py`).
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    model: {
      name: "Hierarchical-Temporal-BP-Seg",
      architecture: "MixVisionTransformer (mit_b0) + ConvLSTM + SegformerDecoder",
      parameters: "4.7 Million",
      license: "MIT License",
      authors: "Baek-Donghyeon (2024)",
      checkpointFound: true,
      checkpointFile: "/models/brachial-plexus.onnx",
      onnxModelUrl: "/models/brachial-plexus.onnx",
      ortWasmUrl: "/ort/ort-wasm-simd-threaded.wasm",
      executionMode: "onnxruntime-web-wasm",
    },
    supportedClasses: BRACHIAL_PLEXUS_CLASSES,
    modelOutputClasses: BRACHIAL_PLEXUS_MODEL_CLASSES.filter((c) => c.id > 0),
    landmarks: [
      { id: "asm", name: "Anterior Scalene Muscle", type: "muscular", echogenicity: "Hypoechoic" },
      { id: "msm", name: "Middle Scalene Muscle", type: "muscular", echogenicity: "Hypoechoic" },
      { id: "sca", name: "Subclavian Artery", type: "vascular", echogenicity: "Anechoic pulsatile" },
    ],
    interscaleneView: {
      modality: "Ultrasound (B-mode 12-15 MHz Linear Array)",
      plane: "Transverse Oblique Neck View (C6 Level)",
      samplePredictions: [],
    },
    educationalNotice:
      "Educational quantitative ultrasound morphometry for brachial plexus localization. Not clinically certified for primary diagnosis.",
  });
}
