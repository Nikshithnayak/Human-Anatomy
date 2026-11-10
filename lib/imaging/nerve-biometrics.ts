/**
 * Pure-TypeScript morphometric analysis & RGBA segmentation mask utilities for
 * 9-class brachial plexus B-mode ultrasound outputs (`[1, 9, 416, 416]`).
 *
 * Class ordering matches `external/brachial-plexus/data/visualization/_overlay.py`:
 *   0: BG
 *   1: C5
 *   2: C6
 *   3: C7/MT
 *   4: C8/LT
 *   5: UT
 *   6: SSN
 *   7: AD
 *   8: PD
 */

export interface NerveClassDescriptor {
  id: number;
  code: string;
  label: string;
  anatomyType: "root" | "trunk" | "division" | "branch";
  colorRgb: [number, number, number];
  colorHex: string;
  /** Published normative resting interscalene CSA range in mm^2 (adults). */
  normalCsaRangeMm2: [number, number];
}

export const BRACHIAL_PLEXUS_MODEL_CLASSES: readonly NerveClassDescriptor[] = [
  {
    id: 0,
    code: "BG",
    label: "Background Tissue",
    anatomyType: "root",
    colorRgb: [0, 0, 0],
    colorHex: "#000000",
    normalCsaRangeMm2: [0, 0],
  },
  {
    id: 1,
    code: "C5",
    label: "C5 Ventral Ramus",
    anatomyType: "root",
    colorRgb: [192, 255, 0],
    colorHex: "#C0FF00",
    normalCsaRangeMm2: [4.5, 9.5],
  },
  {
    id: 2,
    code: "C6",
    label: "C6 Ventral Ramus",
    anatomyType: "root",
    colorRgb: [0, 255, 192],
    colorHex: "#00FFC0",
    normalCsaRangeMm2: [7.0, 14.0],
  },
  {
    id: 3,
    code: "C7/MT",
    label: "C7 Root / Middle Trunk",
    anatomyType: "trunk",
    colorRgb: [64, 140, 255],
    colorHex: "#408CFF",
    normalCsaRangeMm2: [8.0, 16.5],
  },
  {
    id: 4,
    code: "C8/LT",
    label: "C8 Root / Lower Trunk",
    anatomyType: "trunk",
    colorRgb: [255, 64, 96],
    colorHex: "#FF4060",
    normalCsaRangeMm2: [6.0, 13.5],
  },
  {
    id: 5,
    code: "UT",
    label: "Upper Trunk",
    anatomyType: "trunk",
    colorRgb: [96, 255, 96],
    colorHex: "#60FF60",
    normalCsaRangeMm2: [10.0, 22.0],
  },
  {
    id: 6,
    code: "SSN",
    label: "Suprascapular Nerve",
    anatomyType: "branch",
    colorRgb: [34, 211, 238],
    colorHex: "#22D3EE",
    normalCsaRangeMm2: [2.2, 6.5],
  },
  {
    id: 7,
    code: "AD",
    label: "Anterior Division",
    anatomyType: "division",
    colorRgb: [255, 152, 0],
    colorHex: "#FF9800",
    normalCsaRangeMm2: [3.5, 9.5],
  },
  {
    id: 8,
    code: "PD",
    label: "Posterior Division",
    anatomyType: "division",
    colorRgb: [232, 121, 249],
    colorHex: "#E879F9",
    normalCsaRangeMm2: [4.0, 11.0],
  },
] as const;

export type NerveMorphologyStatus =
  | "normal"
  | "swollen"
  | "compressed"
  | "hypoplastic";

export interface NerveClassBiometrics {
  classId: number;
  code: string;
  label: string;
  colorHex: string;
  pixelCount: number;
  meanConfidence: number;
  peakConfidence: number;
  centroidPx: [number, number];
  boundingBoxPx: { minX: number; minY: number; maxX: number; maxY: number };
  majorAxisMm: number;
  minorAxisMm: number;
  flatteningRatio: number;
  csaMm2: number;
  normalRangeMm2: [number, number];
  status: NerveMorphologyStatus;
  finding: string;
}

export interface NerveSegmentationSummary {
  width: number;
  height: number;
  depthCm: number;
  mmPerPixel: number;
  detectedClasses: NerveClassBiometrics[];
  foregroundPixelCount: number;
  primaryAlert: string | null;
  hasHighConfidenceDetection: boolean;
}

export interface AnalyzeMasksOptions {
  width?: number;
  height?: number;
  depthCm?: number;
  minClassProb?: number;
  minPixelCount?: number;
}

/**
 * Classifies measured CSA and aspect flattening against adult normative ranges.
 */
export function classifyNerveMorphology(
  csaMm2: number,
  flatteningRatio: number,
  normalRangeMm2: [number, number],
): { status: NerveMorphologyStatus; finding: string } {
  const [minNormal, maxNormal] = normalRangeMm2;
  if (csaMm2 > maxNormal * 1.15) {
    return {
      status: "swollen",
      finding: `CSA ${csaMm2.toFixed(1)} mm² exceeds normal upper bound (${maxNormal.toFixed(1)} mm²) — consistent with perineural edema or post-traction fascicular swelling.`,
    };
  }
  if (flatteningRatio >= 2.6 && csaMm2 >= minNormal * 0.65) {
    return {
      status: "compressed",
      finding: `Oblong flattening ratio ${flatteningRatio.toFixed(2)}:1 indicates focal fascial/scalene entrapment.`,
    };
  }
  if (csaMm2 < minNormal * 0.55) {
    return {
      status: "hypoplastic",
      finding: `Caliber ${csaMm2.toFixed(1)} mm² is below reference floor (${minNormal.toFixed(1)} mm²) — evaluate partial imaging plane or atrophy.`,
    };
  }
  return {
    status: "normal",
    finding: `CSA ${csaMm2.toFixed(1)} mm² and ovoid ratio ${flatteningRatio.toFixed(2)}:1 lie within normal resting limits.`,
  };
}

/**
 * Analyzes NCHW calibrated probabilities (`[9, H, W]` flattened) produced by
 * `brachial-plexus.onnx` (`post_processing` probabilities in `0..1`).
 */
export function analyzeNerveSegmentationProbs(
  probs: Float32Array | number[],
  options: AnalyzeMasksOptions = {},
): NerveSegmentationSummary {
  const width = options.width ?? 416;
  const height = options.height ?? 416;
  const depthCm = Math.max(1.0, options.depthCm ?? 4.0);
  const minClassProb = options.minClassProb ?? 0.25;
  const minPixelCount = options.minPixelCount ?? 24;

  const numPixels = width * height;
  const mmPerPixel = (depthCm * 10) / height;
  const pixelAreaMm2 = mmPerPixel * mmPerPixel;

  const counts = new Int32Array(9);
  const sumConf = new Float64Array(9);
  const peakConf = new Float32Array(9);
  const sumX = new Float64Array(9);
  const sumY = new Float64Array(9);
  const sumXX = new Float64Array(9);
  const sumYY = new Float64Array(9);
  const sumXY = new Float64Array(9);
  const minX = new Int32Array(9).fill(width);
  const minY = new Int32Array(9).fill(height);
  const maxX = new Int32Array(9).fill(-1);
  const maxY = new Int32Array(9).fill(-1);

  let foregroundPixelCount = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      let bestCls = 0;
      let bestVal = probs[idx] ?? 1.0;

      for (let c = 1; c <= 8; c++) {
        const val = probs[c * numPixels + idx] ?? 0;
        if (val > bestVal) {
          bestVal = val;
          bestCls = c;
        }
      }

      if (bestCls > 0 && bestVal >= minClassProb) {
        foregroundPixelCount += 1;
        counts[bestCls] += 1;
        sumConf[bestCls] += bestVal;
        if (bestVal > peakConf[bestCls]) peakConf[bestCls] = bestVal;
        sumX[bestCls] += x;
        sumY[bestCls] += y;
        sumXX[bestCls] += x * x;
        sumYY[bestCls] += y * y;
        sumXY[bestCls] += x * y;
        if (x < minX[bestCls]) minX[bestCls] = x;
        if (x > maxX[bestCls]) maxX[bestCls] = x;
        if (y < minY[bestCls]) minY[bestCls] = y;
        if (y > maxY[bestCls]) maxY[bestCls] = y;
      }
    }
  }

  const detectedClasses: NerveClassBiometrics[] = [];

  for (let c = 1; c <= 8; c++) {
    const n = counts[c];
    if (n < minPixelCount) continue;

    const desc = BRACHIAL_PLEXUS_MODEL_CLASSES[c];
    const cx = sumX[c] / n;
    const cy = sumY[c] / n;
    const mu20 = Math.max(0.25, sumXX[c] / n - cx * cx);
    const mu02 = Math.max(0.25, sumYY[c] / n - cy * cy);
    const mu11 = sumXY[c] / n - cx * cy;

    // Eigenvalues of the 2x2 central-moment covariance matrix give principal axes.
    const trace = mu20 + mu02;
    const disc = Math.sqrt((mu20 - mu02) * (mu20 - mu02) + 4 * mu11 * mu11);
    const lambda1 = Math.max(0.25, 0.5 * (trace + disc));
    const lambda2 = Math.max(0.25, 0.5 * (trace - disc));

    // For a uniform ellipse, diameter = 4 * sqrt(lambda).
    const minDiameterMm = mmPerPixel * 2;
    const majorAxisMm = Math.max(minDiameterMm, 4 * Math.sqrt(lambda1) * mmPerPixel);
    const minorAxisMm = Math.max(minDiameterMm, 4 * Math.sqrt(lambda2) * mmPerPixel);
    const flatteningRatio = majorAxisMm / minorAxisMm;
    const csaMm2 = n * pixelAreaMm2;

    // Skip sub-0.3 mm wide boundary halo fragments between adjacent nerve classes.
    if (csaMm2 / majorAxisMm < 0.3) continue;

    const { status, finding } = classifyNerveMorphology(
      csaMm2,
      flatteningRatio,
      desc.normalCsaRangeMm2,
    );

    detectedClasses.push({
      classId: c,
      code: desc.code,
      label: desc.label,
      colorHex: desc.colorHex,
      pixelCount: n,
      meanConfidence: sumConf[c] / n,
      peakConfidence: peakConf[c],
      centroidPx: [cx, cy],
      boundingBoxPx: {
        minX: minX[c],
        minY: minY[c],
        maxX: maxX[c],
        maxY: maxY[c],
      },
      majorAxisMm,
      minorAxisMm,
      flatteningRatio,
      csaMm2,
      normalRangeMm2: desc.normalCsaRangeMm2,
      status,
      finding,
    });
  }

  detectedClasses.sort((a, b) => b.pixelCount - a.pixelCount);

  const abnormal = detectedClasses.find(
    (d) => d.status === "swollen" || d.status === "compressed",
  );

  return {
    width,
    height,
    depthCm,
    mmPerPixel,
    detectedClasses,
    foregroundPixelCount,
    primaryAlert: abnormal
      ? `${abnormal.code} (${abnormal.status.toUpperCase()}): ${abnormal.finding}`
      : null,
    hasHighConfidenceDetection: detectedClasses.some((d) => d.peakConfidence >= 0.4),
  };
}

/**
 * Generates an RGBA uint8 buffer (`width * height * 4`) highlighting predicted nerve masks
 * and crisp contour borders for compositing directly onto a B-mode ultrasound `<canvas>`.
 */
export function buildSegmentationOverlayRgba(
  probs: Float32Array | number[],
  width = 416,
  height = 416,
  minClassProb = 0.25,
  alpha = 135,
): Uint8ClampedArray {
  const numPixels = width * height;
  const labels = new Uint8Array(numPixels);
  const rgba = new Uint8ClampedArray(numPixels * 4);

  for (let i = 0; i < numPixels; i++) {
    let bestCls = 0;
    let bestVal = probs[i] ?? 1.0;
    for (let c = 1; c <= 8; c++) {
      const val = probs[c * numPixels + i] ?? 0;
      if (val > bestVal) {
        bestVal = val;
        bestCls = c;
      }
    }
    if (bestCls > 0 && bestVal >= minClassProb) {
      labels[i] = bestCls;
    }
  }

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const idx = row + x;
      const cls = labels[idx];
      if (cls === 0) continue;

      const isEdge =
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        labels[idx - 1] !== cls ||
        labels[idx + 1] !== cls ||
        labels[idx - width] !== cls ||
        labels[idx + width] !== cls;

      const [r, g, b] = BRACHIAL_PLEXUS_MODEL_CLASSES[cls].colorRgb;
      const outIdx = idx * 4;
      rgba[outIdx] = r;
      rgba[outIdx + 1] = g;
      rgba[outIdx + 2] = b;
      rgba[outIdx + 3] = isEdge ? 245 : alpha;
    }
  }

  return rgba;
}

