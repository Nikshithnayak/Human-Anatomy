/**
 * OHIF / Cornerstone-Compatible Radiology Workstation Bridge
 *
 * Powers OHIF Viewers-aligned hanging protocols, calibrated Length / Angle /
 * Elliptical ROI measurements, live Hounsfield Unit (HU) pixel probe,
 * DICOMweb (QIDO-RS) study discovery, and dcmjs TID-1500 Structured Report export.
 */

import dcmjs from "dcmjs";
import type { MedicalVolume, VolumePlane } from "./volume-model";

export type OhifToolId =
  | "crosshairs"
  | "windowLevel"
  | "probe"
  | "length"
  | "angle"
  | "ellipticalRoi"
  | "pan";

export type OhifLayoutMode = "single" | "quad";

export interface OhifHangingProtocol {
  id: string;
  name: string;
  description: string;
  layout: OhifLayoutMode;
  windowWidth: number;
  windowCenter: number;
}

export const OHIF_HANGING_PROTOCOLS: OhifHangingProtocol[] = [
  {
    id: "mpr-single",
    name: "OHIF Single MPR",
    description: "Focused single-plane cross-sectional viewer with full annotation canvas.",
    layout: "single",
    windowWidth: 400,
    windowCenter: 40,
  },
  {
    id: "mpr-quad",
    name: "OHIF 2×2 Quad MPR",
    description: "Standard OHIF multiplanar Axial, Coronal, and Sagittal synchronized viewports.",
    layout: "quad",
    windowWidth: 400,
    windowCenter: 40,
  },
  {
    id: "thoracic-lung",
    name: "OHIF Lung + Mediastinum",
    description: "Pulmonary parenchyma hanging protocol (-600 / 1500 HU).",
    layout: "quad",
    windowWidth: 1500,
    windowCenter: -600,
  },
  {
    id: "osseous-spine",
    name: "OHIF Bone & Spine",
    description: "High-contrast cortical bone protocol (500 / 2000 HU).",
    layout: "quad",
    windowWidth: 2000,
    windowCenter: 500,
  },
];

export interface OhifDicomWebPreset {
  id: string;
  label: string;
  qidoRoot: string;
  wadoRoot: string;
  notes: string;
}

export const OHIF_DICOMWEB_PRESETS: OhifDicomWebPreset[] = [
  {
    id: "aws-static-wado",
    label: "OHIF Public Demo Archive (AWS S3)",
    qidoRoot: "https://d14fa38qiwhyfd.cloudfront.net/dicomweb",
    wadoRoot: "https://d14fa38qiwhyfd.cloudfront.net/dicomweb",
    notes: "Official OHIF Viewers static WADO cloud archive configured in external/ohif.",
  },
  {
    id: "local-static-wado",
    label: "Local StaticWado / Orthanc (:3001)",
    qidoRoot: "http://localhost:3001/dicomweb",
    wadoRoot: "http://localhost:3001/dicomweb",
    notes: "Default local DICOMweb source from external/ohif/platform/app/public/config/local_static.js.",
  },
];

export interface NormalizedPoint {
  x: number; // [0..1] across slice width
  y: number; // [0..1] across slice height
}

export interface OhifMeasurement {
  id: string;
  tool: "length" | "angle" | "ellipticalRoi";
  plane: VolumePlane;
  sliceIndex: number;
  points: NormalizedPoint[];
  summaryText: string;
  metrics: {
    lengthMm?: number;
    angleDeg?: number;
    areaMm2?: number;
    meanHu?: number;
    stdDevHu?: number;
    minHu?: number;
    maxHu?: number;
    voxelCount?: number;
  };
  createdAt: string;
}

export interface HuProbeReading {
  voxel: [number, number, number];
  physicalMm: [number, number, number];
  hu: number;
  tissueLabel: string;
}

export function classifyHuTissue(hu: number): string {
  if (hu <= -850) return "Air / Tracheobronchial Lumen";
  if (hu <= -350) return "Lung Parenchyma";
  if (hu <= -30) return "Adipose / Subcutaneous Fat";
  if (hu <= 18) return "Fluid / CSF / Bile";
  if (hu <= 95) return "Soft Tissue / Parenchyma / Blood";
  if (hu <= 280) return "Calcification / Contrast Vessel";
  return "Trabecular / Cortical Bone";
}

function getPlaneGeometry(volume: MedicalVolume, plane: VolumePlane) {
  if (plane === "axial") {
    return {
      width: volume.width,
      height: volume.height,
      spacingX: volume.spacing[0],
      spacingY: volume.spacing[1],
    };
  }
  if (plane === "coronal") {
    return {
      width: volume.width,
      height: volume.depth,
      spacingX: volume.spacing[0],
      spacingY: volume.spacing[2],
    };
  }
  return {
    width: volume.height,
    height: volume.depth,
    spacingX: volume.spacing[1],
    spacingY: volume.spacing[2],
  };
}

export function sampleVolumeProbe(
  volume: MedicalVolume,
  plane: VolumePlane,
  sliceIndex: number,
  normX: number,
  normY: number
): HuProbeReading {
  const xNorm = Math.max(0, Math.min(1, normX));
  const yNorm = Math.max(0, Math.min(1, normY));

  let vx = 0;
  let vy = 0;
  let vz = 0;

  if (plane === "axial") {
    vx = Math.round(xNorm * (volume.width - 1));
    vy = Math.round(yNorm * (volume.height - 1));
    vz = Math.max(0, Math.min(volume.depth - 1, sliceIndex));
  } else if (plane === "coronal") {
    vx = Math.round(xNorm * (volume.width - 1));
    vy = Math.max(0, Math.min(volume.height - 1, sliceIndex));
    vz = Math.round((1 - yNorm) * (volume.depth - 1));
  } else {
    vx = Math.max(0, Math.min(volume.width - 1, sliceIndex));
    vy = Math.round(xNorm * (volume.height - 1));
    vz = Math.round((1 - yNorm) * (volume.depth - 1));
  }

  const hu = volume.getVoxel(vx, vy, vz);
  const physicalMm = volume.voxelToMillimeters(vx, vy, vz);

  return {
    voxel: [vx, vy, vz],
    physicalMm,
    hu,
    tissueLabel: classifyHuTissue(hu),
  };
}

export function measureLineMm(
  volume: MedicalVolume,
  plane: VolumePlane,
  p1: NormalizedPoint,
  p2: NormalizedPoint
): number {
  const geom = getPlaneGeometry(volume, plane);
  const dxMm = (p2.x - p1.x) * (geom.width - 1) * geom.spacingX;
  const dyMm = (p2.y - p1.y) * (geom.height - 1) * geom.spacingY;
  return Math.hypot(dxMm, dyMm);
}

export function measureAngleDegrees(
  volume: MedicalVolume,
  plane: VolumePlane,
  p1: NormalizedPoint,
  vertex: NormalizedPoint,
  p2: NormalizedPoint
): number {
  const geom = getPlaneGeometry(volume, plane);
  const scaleX = (geom.width - 1) * geom.spacingX;
  const scaleY = (geom.height - 1) * geom.spacingY;

  const v1x = (p1.x - vertex.x) * scaleX;
  const v1y = (p1.y - vertex.y) * scaleY;
  const v2x = (p2.x - vertex.x) * scaleX;
  const v2y = (p2.y - vertex.y) * scaleY;

  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 < 1e-4 || mag2 < 1e-4) return 0;

  const cosTheta = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

export function measureEllipticalRoi(
  volume: MedicalVolume,
  plane: VolumePlane,
  sliceIndex: number,
  corner1: NormalizedPoint,
  corner2: NormalizedPoint
): {
  areaMm2: number;
  meanHu: number;
  stdDevHu: number;
  minHu: number;
  maxHu: number;
  voxelCount: number;
} {
  const geom = getPlaneGeometry(volume, plane);
  const slice = volume.extractSlice(plane, sliceIndex);

  const cx = ((corner1.x + corner2.x) / 2) * (geom.width - 1);
  const cy = ((corner1.y + corner2.y) / 2) * (geom.height - 1);
  const rx = Math.max(1, (Math.abs(corner2.x - corner1.x) / 2) * (geom.width - 1));
  const ry = Math.max(1, (Math.abs(corner2.y - corner1.y) / 2) * (geom.height - 1));

  const minX = Math.max(0, Math.floor(cx - rx));
  const maxX = Math.min(slice.width - 1, Math.ceil(cx + rx));
  const minY = Math.max(0, Math.floor(cy - ry));
  const maxY = Math.min(slice.height - 1, Math.ceil(cy + ry));

  const samples: number[] = [];
  let sum = 0;
  let minHu = Infinity;
  let maxHu = -Infinity;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1.0) {
        const hu = slice.pixelData[y * slice.width + x];
        samples.push(hu);
        sum += hu;
        if (hu < minHu) minHu = hu;
        if (hu > maxHu) maxHu = hu;
      }
    }
  }

  const voxelCount = samples.length;
  const rxMm = rx * geom.spacingX;
  const ryMm = ry * geom.spacingY;
  const areaMm2 = Math.PI * rxMm * ryMm;

  if (voxelCount === 0) {
    return { areaMm2, meanHu: 0, stdDevHu: 0, minHu: 0, maxHu: 0, voxelCount: 0 };
  }

  const meanHu = sum / voxelCount;
  let sqDiff = 0;
  for (let i = 0; i < voxelCount; i++) {
    const d = samples[i] - meanHu;
    sqDiff += d * d;
  }
  const stdDevHu = Math.sqrt(sqDiff / voxelCount);

  return { areaMm2, meanHu, stdDevHu, minHu, maxHu, voxelCount };
}

/**
 * Generates an OHIF / dcmjs TID-1500 compatible Structured Report JSON export
 */
export function exportOhifDicomSrReport(volume: MedicalVolume, measurements: OhifMeasurement[]) {
  const reportUid = dcmjs?.data?.DicomMetaDictionary?.uid
    ? dcmjs.data.DicomMetaDictionary.uid()
    : `2.25.${Date.now()}`;

  return {
    schema: "OHIF/dcmjs TID 1500 Measurement Report (De-identified)",
    sopClassUID: "1.2.840.10008.5.1.4.1.1.88.33", // Comprehensive SR Storage
    sopInstanceUID: reportUid,
    studyInstanceUID: volume.metadata.studyInstanceUid || "2.25.100001",
    seriesInstanceUID: volume.metadata.seriesInstanceUid || "2.25.100002",
    deidentifiedCaseId: volume.metadata.deidentifiedCaseId,
    modality: volume.metadata.modality,
    seriesDescription: volume.metadata.seriesDescription,
    spacingMm: volume.spacing,
    dimensions: volume.dimensions,
    generatedAt: new Date().toISOString(),
    trackingOrigin: "OHIF/Viewers Measurement Tracking Adapter (dcmjs)",
    measurements: measurements.map((m, idx) => ({
      trackingIdentifier: `Measurement_${idx + 1}`,
      trackingUniqueIdentifier: m.id,
      findingType: m.tool,
      plane: m.plane,
      sliceNumber: m.sliceIndex + 1,
      summary: m.summaryText,
      metrics: m.metrics,
      pointsNormalized: m.points,
    })),
  };
}

export interface DicomWebStudySummary {
  studyInstanceUid: string;
  studyDate: string;
  studyDescription: string;
  modalitiesInStudy: string;
  accessionNumber: string;
  numInstances: number;
}

function readTagValue(studyObj: Record<string, { Value?: unknown[] }>, tag: string): string {
  const entry = studyObj[tag];
  if (!entry || !Array.isArray(entry.Value) || entry.Value.length === 0) return "";
  const first = entry.Value[0];
  if (typeof first === "string" || typeof first === "number") return String(first);
  if (first && typeof first === "object" && "Alphabetic" in first) {
    return String((first as { Alphabetic?: string }).Alphabetic || "");
  }
  return "";
}

export async function queryOhifDicomWebStudies(
  qidoRoot: string,
  limit: number = 12
): Promise<DicomWebStudySummary[]> {
  const cleanRoot = qidoRoot.replace(/\/+$/, "");
  const url = `${cleanRoot}/studies?limit=${limit}&includefield=00081030,00080061,00201208`;
  const res = await fetch(url, {
    headers: { Accept: "application/dicom+json, application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`DICOMweb QIDO-RS returned HTTP ${res.status}`);
  }
  const rows = (await res.json()) as Record<string, { Value?: unknown[] }>[];
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => ({
    studyInstanceUid: readTagValue(row, "0020000D") || "Unknown UID",
    studyDate: readTagValue(row, "00080020") || "—",
    studyDescription: readTagValue(row, "00081030") || "DICOM Study",
    modalitiesInStudy: readTagValue(row, "00080061") || "CT/MR",
    accessionNumber: readTagValue(row, "00080050") || "De-identified",
    numInstances: parseInt(readTagValue(row, "00201208") || "0", 10) || 0,
  }));
}

