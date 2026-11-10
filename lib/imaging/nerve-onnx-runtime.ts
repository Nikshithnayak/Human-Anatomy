/**
 * Browser-side ONNX Runtime Web inference engine for the trained
 * SegFormer (mit_b0) + ConvLSTM brachial plexus segmentation model.
 *
 * Loads `/models/brachial-plexus.onnx` lazily and executes CPU WASM
 * inference strictly in the browser (`executionProviders: ["wasm"]`),
 * serving pre-copied runtime binaries from `/ort/`.
 */

import {
  analyzeNerveSegmentationProbs,
  buildSegmentationOverlayRgba,
  type NerveSegmentationSummary,
} from "./nerve-biometrics";

export const BRACHIAL_PLEXUS_ONNX_URL = "/models/brachial-plexus.onnx";
export const MODEL_INPUT_SIZE = 416;

export interface NerveOnnxInferenceResult {
  summary: NerveSegmentationSummary;
  probs: Float32Array;
  overlayRgba: Uint8ClampedArray;
  inferenceMs: number;
  modelLoadMs: number;
}

type OrtModule = typeof import("onnxruntime-web/wasm");

let ortModulePromise: Promise<OrtModule> | null = null;
let sessionPromise: Promise<{
  ort: OrtModule;
  session: import("onnxruntime-web").InferenceSession;
  loadMs: number;
}> | null = null;

async function getOrtSession() {
  if (typeof window === "undefined") {
    throw new Error("ONNX Runtime Web inference can only run in the browser.");
  }

  if (!sessionPromise) {
    sessionPromise = (async () => {
      const t0 = performance.now();
      ortModulePromise ??= import("onnxruntime-web/wasm");
      const ort = await ortModulePromise;

      ort.env.wasm.wasmPaths = {
        wasm: "/ort/ort-wasm-simd-threaded.wasm",
      };
      // Single-threaded WASM avoids requiring Cross-Origin-Opener/Embedder headers.
      ort.env.wasm.numThreads = 1;

      const session = await ort.InferenceSession.create(BRACHIAL_PLEXUS_ONNX_URL, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });

      return {
        ort,
        session,
        loadMs: Math.round(performance.now() - t0),
      };
    })();
  }

  try {
    return await sessionPromise;
  } catch (err) {
    sessionPromise = null;
    throw err;
  }
}

/**
 * Converts any decoded image/canvas into the exact `float32 [1, 1, 416, 416]`
 * normalized `[0.0 .. 1.0]` grayscale tensor expected by `brachial-plexus.onnx`.
 */
export function extractGrayscaleTensor(
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  size = MODEL_INPUT_SIZE,
): Float32Array {
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Unable to acquire 2D canvas context for ultrasound preprocessing.");
  }

  ctx.drawImage(source, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const input = new Float32Array(size * size);

  // Rec.601 luminance matching OpenCV BGR2GRAY (`0.299 R + 0.587 G + 0.114 B`) / 255.0
  for (let i = 0, p = 0; i < input.length; i++, p += 4) {
    const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    input[i] = lum / 255.0;
  }

  return input;
}

export async function runBrachialPlexusOnnxInference(
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  options?: {
    depthCm?: number;
    minClassProb?: number;
    minPixelCount?: number;
  },
): Promise<NerveOnnxInferenceResult> {
  const { ort, session, loadMs } = await getOrtSession();

  const grayscale = extractGrayscaleTensor(source, MODEL_INPUT_SIZE);
  const inputTensor = new ort.Tensor("float32", grayscale, [
    1,
    1,
    MODEL_INPUT_SIZE,
    MODEL_INPUT_SIZE,
  ]);

  const t0 = performance.now();
  const outputs = await session.run({ frame: inputTensor });
  const inferenceMs = Math.round(performance.now() - t0);

  const probsTensor = outputs.probs ?? Object.values(outputs)[0];
  if (!probsTensor) {
    throw new Error("ONNX session returned no output tensor.");
  }
  const probs = probsTensor.data as Float32Array;

  const minClassProb = options?.minClassProb ?? 0.25;
  const summary = analyzeNerveSegmentationProbs(probs, {
    width: MODEL_INPUT_SIZE,
    height: MODEL_INPUT_SIZE,
    depthCm: options?.depthCm ?? 4.0,
    minClassProb,
    minPixelCount: options?.minPixelCount ?? 12,
  });

  const overlayRgba = buildSegmentationOverlayRgba(
    probs,
    MODEL_INPUT_SIZE,
    MODEL_INPUT_SIZE,
    minClassProb,
    145,
  );

  return {
    summary,
    probs,
    overlayRgba,
    inferenceMs,
    modelLoadMs: loadMs,
  };
}

