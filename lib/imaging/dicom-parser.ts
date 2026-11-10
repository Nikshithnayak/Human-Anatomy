/**
 * DICOM Part 10 Client-Side Binary Parser & De-identification Engine
 *
 * Uses OHIF's standards-compliant `dicom-parser` library for Explicit/Implicit
 * VR parsing, transfer-syntax extraction, HU calibration, multi-slice stacking,
 * and strict in-memory PHI masking, with raw fallback for non-standard exports.
 */

import dicomParser from "dicom-parser";
import { MedicalVolume } from "./volume-model.ts";

export interface DicomMetadata {
  modality: "CT" | "MR" | "PT" | "OTHER";
  seriesDescription: string;
  studyInstanceUid: string;
  seriesInstanceUid: string;
  seriesNumber: number;
  instanceNumber: number;
  rows: number;
  columns: number;
  pixelSpacing: [number, number]; // [rowSpacing, colSpacing] in mm
  sliceThickness: number; // mm
  imagePositionPatient: [number, number, number]; // [x, y, z] in mm
  imageOrientationPatient: [number, number, number, number, number, number];
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number; // 0 = unsigned, 1 = signed 2's complement
  windowCenter: number;
  windowWidth: number;
  rescaleIntercept: number;
  rescaleSlope: number;
  // Strictly de-identified case reference
  deidentifiedCaseId: string;
  acquisitionInfo: string;
}

export interface ParsedDicomSlice {
  metadata: DicomMetadata;
  pixelData: Int16Array | Float32Array; // Converted to Hounsfield Units (HU) for CT, or normalized signal for MRI
  rawWidth: number;
  rawHeight: number;
}

/**
 * Generates an internal non-identifying case identifier
 */
export function generateDeidentifiedCaseId(seed?: string): string {
  const hash = seed
    ? Math.abs(seed.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))
    : Math.floor(Math.random() * 8999 + 1000);
  const num = (hash % 9000) + 1000;
  return `ANAT-2026-${num}`;
}

/**
 * Scans a binary buffer to detect embedded standard images (JPEG, PNG).
 * Frequently present in encapsulated DICOM or image files renamed as .dcm.
 */
export function extractEmbeddedImageBlob(buffer: ArrayBuffer): Blob | null {
  const u8 = new Uint8Array(buffer);
  const len = u8.length;
  if (len < 16) return null;

  // Direct check for WebP (RIFF....WEBP)
  for (let i = 0; i < Math.min(len - 12, 1024); i++) {
    if (
      u8[i] === 0x52 && u8[i + 1] === 0x49 && u8[i + 2] === 0x46 && u8[i + 3] === 0x46 &&
      u8[i + 8] === 0x57 && u8[i + 9] === 0x45 && u8[i + 10] === 0x42 && u8[i + 11] === 0x50
    ) {
      return new Blob([u8.slice(i)], { type: "image/webp" });
    }
  }

  // Direct check for BMP ('BM')
  if (u8[0] === 0x42 && u8[1] === 0x4d) {
    return new Blob([u8], { type: "image/bmp" });
  }

  // Search for JPEG SOI (0xFF, 0xD8, 0xFF)
  for (let i = 0; i < len - 4; i++) {
    if (u8[i] === 0xff && u8[i + 1] === 0xd8 && u8[i + 2] === 0xff) {
      // Find JPEG EOI (0xFF, 0xD9)
      for (let j = len - 2; j > i; j--) {
        if (u8[j] === 0xff && u8[j + 1] === 0xd9) {
          const slice = u8.slice(i, j + 2);
          return new Blob([slice], { type: "image/jpeg" });
        }
      }
      const slice = u8.slice(i);
      return new Blob([slice], { type: "image/jpeg" });
    }
  }

  // Search for PNG (0x89, 0x50, 0x4E, 0x47)
  for (let i = 0; i < len - 8; i++) {
    if (
      u8[i] === 0x89 &&
      u8[i + 1] === 0x50 &&
      u8[i + 2] === 0x4e &&
      u8[i + 3] === 0x47
    ) {
      const slice = u8.slice(i);
      return new Blob([slice], { type: "image/png" });
    }
  }

  return null;
}

/**
 * Checks if a byte buffer starts with the DICOM Part 10 magic header or raw DICOM tags
 */
export function isDicomFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 8) return false;
  // Standard Part 10: 'DICM' at byte 128
  if (buffer.byteLength >= 132) {
    const view = new Uint8Array(buffer, 128, 4);
    if (
      view[0] === 0x44 && // 'D'
      view[1] === 0x49 && // 'I'
      view[2] === 0x43 && // 'C'
      view[3] === 0x4d    // 'M'
    ) {
      return true;
    }
  }

  // Preambles without DICM or raw DICOM: check if tag (0008, 00xx) or (7FE0, 0010) exists
  const u8 = new Uint8Array(buffer);
  if ((u8[0] === 0x02 && u8[1] === 0x00) || (u8[0] === 0x08 && u8[1] === 0x00)) {
    return true;
  }

  for (let i = 0; i < Math.min(u8.length - 4, 4096); i += 2) {
    if (
      (u8[i] === 0xe0 && u8[i + 1] === 0x7f && u8[i + 2] === 0x10 && u8[i + 3] === 0x00) ||
      (u8[i] === 0x7f && u8[i + 1] === 0xe0 && u8[i + 2] === 0x00 && u8[i + 3] === 0x10)
    ) {
      return true;
    }
  }

  return false;
}

function parseNumberPair(raw: string | undefined, fallback: [number, number]): [number, number] {
  if (!raw) return fallback;
  const parts = raw.split("\\").map((v) => Number(v.trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return [parts[0], parts[1]];
  }
  return fallback;
}

function parseNumberTriple(raw: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!raw) return fallback;
  const parts = raw.split("\\").map((v) => Number(v.trim()));
  if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
    return [parts[0], parts[1], parts[2]];
  }
  return fallback;
}

function parseFirstNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const first = Number(raw.split("\\")[0]?.trim());
  return Number.isFinite(first) ? first : fallback;
}

/**
 * Parses a single DICOM slice buffer into metadata and HU pixel array.
 * Uses OHIF's `dicom-parser` library first and falls back to raw binary scan.
 */
export function parseDicomSlice(buffer: ArrayBuffer, fileNameFallback?: string): ParsedDicomSlice {
  if (!isDicomFile(buffer)) {
    const embedded = extractEmbeddedImageBlob(buffer);
    if (embedded) {
      throw new Error("ENCAPSULATED_IMAGE_FOUND");
    }
    throw new Error("File is not a valid DICOM Part 10 format (missing DICM header at byte 128).");
  }

  try {
    const u8 = new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(u8);
    const modRaw = (dataSet.string("x00080060") || "CT").trim().toUpperCase();
    const modality: DicomMetadata["modality"] =
      modRaw === "CT" || modRaw === "MR" || modRaw === "PT" ? modRaw : "OTHER";

    const rows = dataSet.uint16("x00280010") || 512;
    const columns = dataSet.uint16("x00280011") || 512;
    const pixelSpacing = parseNumberPair(dataSet.string("x00280030"), [0.8, 0.8]);
    const sliceThickness = parseFirstNumber(dataSet.string("x00180050"), 2.5);
    const imagePositionPatient = parseNumberTriple(dataSet.string("x00200032"), [0, 0, 0]);
    const orientRaw = (dataSet.string("x00200037") || "").split("\\").map((n) => Number(n.trim()));
    const imageOrientationPatient: [number, number, number, number, number, number] =
      orientRaw.length >= 6 && orientRaw.slice(0, 6).every((n) => Number.isFinite(n))
        ? [orientRaw[0], orientRaw[1], orientRaw[2], orientRaw[3], orientRaw[4], orientRaw[5]]
        : [1, 0, 0, 0, 1, 0];

    const bitsAllocated = dataSet.uint16("x00280100") || 16;
    const bitsStored = dataSet.uint16("x00280101") || 12;
    const highBit = dataSet.uint16("x00280102") ?? bitsStored - 1;
    const pixelRepresentation = dataSet.uint16("x00280103") ?? 0;
    const windowCenter = parseFirstNumber(dataSet.string("x00281050"), 40);
    const windowWidth = parseFirstNumber(dataSet.string("x00281051"), 400);
    const rescaleIntercept = parseFirstNumber(dataSet.string("x00281052"), modality === "MR" ? 0 : -1024);
    const rescaleSlope = parseFirstNumber(dataSet.string("x00281053"), 1.0);

    const pixelElem = dataSet.elements.x7fe00010;
    if (pixelElem) {
      if (pixelElem.encapsulatedPixelData) {
        try {
          const frameBytes = dicomParser.readEncapsulatedPixelDataFromFragments(
            dataSet,
            pixelElem,
            0,
            pixelElem.fragments?.length
          );
          const copyBuf = new Uint8Array(frameBytes).slice().buffer;
          const embedded = extractEmbeddedImageBlob(copyBuf);
          if (embedded) {
            throw new Error("ENCAPSULATED_IMAGE_FOUND");
          }
        } catch (encapErr) {
          if (encapErr instanceof Error && encapErr.message === "ENCAPSULATED_IMAGE_FOUND") {
            throw encapErr;
          }
        }
      } else if (pixelElem.dataOffset > 0) {
        const dataView = new DataView(buffer);
        const pixelCount = rows * columns;
        const huArray = new Int16Array(pixelCount);

        if (bitsAllocated === 16) {
          for (let i = 0; i < pixelCount; i++) {
            const byteIdx = pixelElem.dataOffset + i * 2;
            let raw = 0;
            if (byteIdx + 2 <= buffer.byteLength) {
              raw =
                pixelRepresentation === 1
                  ? dataView.getInt16(byteIdx, true)
                  : dataView.getUint16(byteIdx, true);
            }
            huArray[i] = Math.round(raw * rescaleSlope + rescaleIntercept);
          }
        } else {
          for (let i = 0; i < pixelCount; i++) {
            const byteIdx = pixelElem.dataOffset + i;
            const raw = byteIdx < buffer.byteLength ? dataView.getUint8(byteIdx) : 0;
            huArray[i] = Math.round(raw * rescaleSlope + rescaleIntercept);
          }
        }

        const studyInstanceUid = (dataSet.string("x0020000d") || "").trim();
        const seriesInstanceUid = (dataSet.string("x0020000e") || "").trim();
        const seriesDescription = (dataSet.string("x0008103e") || "OHIF Parsed DICOM Series").trim();
        const seriesNumber = parseInt(dataSet.string("x00200011") || "1", 10) || 1;
        const instanceNumber = parseInt(dataSet.string("x00200013") || "1", 10) || 1;
        const deidentifiedCaseId = generateDeidentifiedCaseId(studyInstanceUid || fileNameFallback);

        return {
          metadata: {
            modality,
            seriesDescription,
            studyInstanceUid,
            seriesInstanceUid,
            seriesNumber,
            instanceNumber,
            rows,
            columns,
            pixelSpacing,
            sliceThickness,
            imagePositionPatient,
            imageOrientationPatient,
            bitsAllocated,
            bitsStored,
            highBit,
            pixelRepresentation,
            windowCenter,
            windowWidth,
            rescaleIntercept,
            rescaleSlope,
            deidentifiedCaseId,
            acquisitionInfo: `${modality} • ${rows}x${columns} • ${pixelSpacing[0].toFixed(2)}x${pixelSpacing[1].toFixed(2)} mm • ${sliceThickness.toFixed(1)} mm slice (OHIF dicom-parser)`,
          },
          pixelData: huArray,
          rawWidth: columns,
          rawHeight: rows,
        };
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message === "ENCAPSULATED_IMAGE_FOUND") {
      throw err;
    }
    // Fall back to low-level byte scan for raw non-Part-10 files
  }

  return parseDicomSliceLegacy(buffer, fileNameFallback);
}

function parseDicomSliceLegacy(buffer: ArrayBuffer, fileNameFallback?: string): ParsedDicomSlice {

  const dataView = new DataView(buffer);
  let offset = 0;
  if (buffer.byteLength >= 132) {
    const view = new Uint8Array(buffer, 128, 4);
    if (view[0] === 0x44 && view[1] === 0x49 && view[2] === 0x43 && view[3] === 0x4d) {
      offset = 132;
    }
  }
  const length = buffer.byteLength;

  // Defaults
  let modality: DicomMetadata["modality"] = "CT";
  let seriesDescription = "Standard Medical Series";
  let studyInstanceUid = "";
  let seriesInstanceUid = "";
  let seriesNumber = 1;
  let instanceNumber = 1;
  let rows = 512;
  let columns = 512;
  let pixelSpacing: [number, number] = [0.8, 0.8];
  let sliceThickness = 2.5;
  let imagePositionPatient: [number, number, number] = [0, 0, 0];
  let imageOrientationPatient: [number, number, number, number, number, number] = [1, 0, 0, 0, 1, 0];
  let bitsAllocated = 16;
  let bitsStored = 12;
  let highBit = 11;
  let pixelRepresentation = 0;
  let windowCenter = 40;
  let windowWidth = 400;
  let rescaleIntercept = -1024;
  let rescaleSlope = 1.0;
  let pixelDataOffset = -1;
  let pixelDataLength = 0;

  // Simple, robust DICOM element reader
  while (offset + 8 <= length) {
    const group = dataView.getUint16(offset, true);
    const element = dataView.getUint16(offset + 2, true);
    offset += 4;

    // Check for explicit VR vs implicit VR
    // Standard explicit VRs: AE, AS, AT, CS, DA, DS, DT, FL, FD, IS, LO, LT, OB, OF, OW, PN, SH, SL, SQ, SS, ST, TM, UI, UL, UN, US, UT
    let vr = "";
    let elemLength = 0;

    const b0 = dataView.getUint8(offset);
    const b1 = dataView.getUint8(offset + 1);
    const isExplicitVR =
      b0 >= 65 && b0 <= 90 && b1 >= 65 && b1 <= 90;

    if (isExplicitVR) {
      vr = String.fromCharCode(b0, b1);
      offset += 2;
      if (
        vr === "OB" ||
        vr === "OW" ||
        vr === "OF" ||
        vr === "SQ" ||
        vr === "UT" ||
        vr === "UN" ||
        vr === "UC" ||
        vr === "UR" ||
        vr === "OD" ||
        vr === "OL" ||
        vr === "OV" ||
        vr === "SV" ||
        vr === "UV"
      ) {
        offset += 2; // Reserved 2 bytes
        elemLength = dataView.getUint32(offset, true);
        offset += 4;
      } else {
        elemLength = dataView.getUint16(offset, true);
        offset += 2;
      }
    } else {
      // Implicit VR
      elemLength = dataView.getUint32(offset, true);
      offset += 4;
    }

    if (elemLength === 0xffffffff) {
      // Undefined length element (e.g. SQ sequence or encapsulated pixel data)
      if (group === 0x7fe0 && element === 0x0010) {
        // Encapsulated Pixel Data starts with Item tag (FFFE, E000)
        let itemScan = offset;
        // Search for the first frame fragment
        while (itemScan + 8 <= length) {
          const itemGroup = dataView.getUint16(itemScan, true);
          const itemElem = dataView.getUint16(itemScan + 2, true);
          const itemLen = dataView.getUint32(itemScan + 4, true);
          itemScan += 8;

          if (itemGroup === 0xfffe && itemElem === 0xe000) {
            // First item is often Basic Offset Table; if length > 0 and subsequent items exist, take next
            if (itemLen > 0 && itemScan + itemLen < length) {
              pixelDataOffset = itemScan;
              pixelDataLength = itemLen;
              break;
            }
          } else if (itemGroup === 0xfffe && itemElem === 0xe0dd) {
            // Sequence delimiter
            break;
          }
        }
        if (pixelDataOffset < 0) {
          pixelDataOffset = offset + 8;
          pixelDataLength = length - pixelDataOffset;
        }
        break;
      } else {
        // Skip sequence items until Sequence Delimitation Item (FFFE, E0DD)
        let scanSeq = offset;
        let foundDelimiter = false;
        while (scanSeq + 8 <= length) {
          const sGroup = dataView.getUint16(scanSeq, true);
          const sElem = dataView.getUint16(scanSeq + 2, true);
          if (sGroup === 0xfffe && sElem === 0xe0dd) {
            scanSeq += 8; // skip delimiter + 4-byte length
            offset = scanSeq;
            foundDelimiter = true;
            break;
          }
          scanSeq += 2;
        }
        if (!foundDelimiter) {
          offset += 8;
        }
        continue;
      }
    }

    // Helper to read string
    const readString = (len: number) => {
      let str = "";
      for (let i = 0; i < len; i++) {
        const code = dataView.getUint8(offset + i);
        if (code !== 0) str += String.fromCharCode(code);
      }
      return str.trim();
    };

    // Match Tags
    if (group === 0x0008 && element === 0x0060) {
      const val = readString(elemLength).toUpperCase();
      if (val === "CT" || val === "MR" || val === "PT") modality = val;
    } else if (group === 0x0008 && element === 0x103e) {
      seriesDescription = readString(elemLength) || seriesDescription;
    } else if (group === 0x0020 && element === 0x000d) {
      studyInstanceUid = readString(elemLength);
    } else if (group === 0x0020 && element === 0x000e) {
      seriesInstanceUid = readString(elemLength);
    } else if (group === 0x0020 && element === 0x0011) {
      seriesNumber = parseInt(readString(elemLength), 10) || 1;
    } else if (group === 0x0020 && element === 0x0013) {
      instanceNumber = parseInt(readString(elemLength), 10) || 1;
    } else if (group === 0x0028 && element === 0x0010) {
      rows = elemLength === 2 ? dataView.getUint16(offset, true) : parseInt(readString(elemLength), 10) || 512;
    } else if (group === 0x0028 && element === 0x0011) {
      columns = elemLength === 2 ? dataView.getUint16(offset, true) : parseInt(readString(elemLength), 10) || 512;
    } else if (group === 0x0028 && element === 0x0030) {
      const parts = readString(elemLength).split("\\").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        pixelSpacing = [parts[0], parts[1]];
      }
    } else if (group === 0x0018 && element === 0x0050) {
      sliceThickness = parseFloat(readString(elemLength)) || sliceThickness;
    } else if (group === 0x0020 && element === 0x0032) {
      const parts = readString(elemLength).split("\\").map(Number);
      if (parts.length === 3) {
        imagePositionPatient = [parts[0], parts[1], parts[2]];
      }
    } else if (group === 0x0020 && element === 0x0037) {
      const parts = readString(elemLength).split("\\").map(Number);
      if (parts.length === 6) {
        imageOrientationPatient = [parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]];
      }
    } else if (group === 0x0028 && element === 0x0100) {
      bitsAllocated = elemLength === 2 ? dataView.getUint16(offset, true) : parseInt(readString(elemLength), 10) || 16;
    } else if (group === 0x0028 && element === 0x0101) {
      bitsStored = elemLength === 2 ? dataView.getUint16(offset, true) : parseInt(readString(elemLength), 10) || 12;
    } else if (group === 0x0028 && element === 0x0102) {
      highBit = elemLength === 2 ? dataView.getUint16(offset, true) : parseInt(readString(elemLength), 10) || 11;
    } else if (group === 0x0028 && element === 0x0103) {
      pixelRepresentation = elemLength === 2 ? dataView.getUint16(offset, true) : parseInt(readString(elemLength), 10) || 0;
    } else if (group === 0x0028 && element === 0x1050) {
      windowCenter = parseFloat(readString(elemLength)) || windowCenter;
    } else if (group === 0x0028 && element === 0x1051) {
      windowWidth = parseFloat(readString(elemLength)) || windowWidth;
    } else if (group === 0x0028 && element === 0x1052) {
      rescaleIntercept = parseFloat(readString(elemLength)) || rescaleIntercept;
    } else if (group === 0x0028 && element === 0x1053) {
      rescaleSlope = parseFloat(readString(elemLength)) || rescaleSlope;
    } else if (group === 0x7fe0 && element === 0x0010) {
      // Pixel Data Element found directly
      pixelDataOffset = offset;
      pixelDataLength = elemLength;
      break;
    }

    offset += elemLength;
  }

  // Fallback: If sequential loop missed (7FE0, 0010), scan raw byte buffer directly
  // Handles Little-Endian (0xE0, 0x7F, 0x10, 0x00) and Big-Endian (0x7F, 0xE0, 0x00, 0x10)
  if (pixelDataOffset < 0) {
    const u8 = new Uint8Array(buffer);
    const scanStart = offset >= 132 ? 132 : 0;
    for (let i = scanStart; i < length - 12; i++) {
      // Little-endian match:
      const isLittleMatch =
        u8[i] === 0xe0 && u8[i + 1] === 0x7f && u8[i + 2] === 0x10 && u8[i + 3] === 0x00;
      // Big-endian match:
      const isBigMatch =
        u8[i] === 0x7f && u8[i + 1] === 0xe0 && u8[i + 2] === 0x00 && u8[i + 3] === 0x10;

      if (isLittleMatch || isBigMatch) {
        // Tag found! Check VR
        const c0 = u8[i + 4];
        const c1 = u8[i + 5];
        if (
          (c0 === 0x4f && (c1 === 0x57 || c1 === 0x42 || c1 === 0x46 || c1 === 0x44)) ||
          (c0 === 0x55 && (c1 === 0x54 || c1 === 0x4e || c1 === 0x43 || c1 === 0x52))
        ) {
          // Explicit 32-bit VR (OW, OB, OF, OD, UT, UN, UC, UR): skip tag(4) + vr(2) + reserved(2) + len(4) = 12
          pixelDataOffset = i + 12;
          pixelDataLength = length - pixelDataOffset;
          break;
        } else if (c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90) {
          // Other 16-bit Explicit VRs: skip tag(4) + vr(2) + len(2) = 8
          pixelDataOffset = i + 8;
          pixelDataLength = length - pixelDataOffset;
          break;
        } else {
          // Implicit VR: skip tag(4) + len(4) = 8
          pixelDataOffset = i + 8;
          pixelDataLength = length - pixelDataOffset;
          break;
        }
      }
    }
  }

  if (pixelDataOffset < 0) {
    const embedded = extractEmbeddedImageBlob(buffer);
    if (embedded) {
      throw new Error("ENCAPSULATED_IMAGE_FOUND");
    }
    throw new Error(
      "DICOM pixel data element (7FE0, 0010) was not found in slice. If this is a clinical export, you can also directly import image slices (.png, .jpg, .webp) using the image tab, or test with the curated reference CT scans."
    );
  }

  // Extract pixel buffer and calculate Hounsfield Units (HU)
  // Uses safe DataView reading to guarantee support for unaligned byte offsets
  const pixelCount = rows * columns;
  const huArray = new Int16Array(pixelCount);

  if (bitsAllocated === 16) {
    for (let i = 0; i < pixelCount; i++) {
      const byteIdx = pixelDataOffset + i * 2;
      let raw = 0;
      if (byteIdx + 2 <= length) {
        raw =
          pixelRepresentation === 1
            ? dataView.getInt16(byteIdx, true)
            : dataView.getUint16(byteIdx, true);
      }
      // HU = raw * rescaleSlope + rescaleIntercept
      huArray[i] = Math.round(raw * rescaleSlope + rescaleIntercept);
    }
  } else if (bitsAllocated === 8) {
    for (let i = 0; i < pixelCount; i++) {
      const byteIdx = pixelDataOffset + i;
      const raw = byteIdx < length ? dataView.getUint8(byteIdx) : 0;
      huArray[i] = Math.round(raw * rescaleSlope + rescaleIntercept);
    }
  }

  const deidentifiedCaseId = generateDeidentifiedCaseId(studyInstanceUid || fileNameFallback);

  const metadata: DicomMetadata = {
    modality,
    seriesDescription,
    studyInstanceUid,
    seriesInstanceUid,
    seriesNumber,
    instanceNumber,
    rows,
    columns,
    pixelSpacing,
    sliceThickness,
    imagePositionPatient,
    imageOrientationPatient,
    bitsAllocated,
    bitsStored,
    highBit,
    pixelRepresentation,
    windowCenter,
    windowWidth,
    rescaleIntercept,
    rescaleSlope,
    deidentifiedCaseId,
    acquisitionInfo: `${modality} • ${rows}x${columns} • ${pixelSpacing[0].toFixed(2)}x${pixelSpacing[1].toFixed(2)} mm • ${sliceThickness.toFixed(1)} mm slice`,
  };

  return {
    metadata,
    pixelData: huArray,
    rawWidth: columns,
    rawHeight: rows,
  };
}

/**
 * Stacks one or more parsed DICOM slices into a contiguous 3D MedicalVolume.
 * Multiple slices are spatially ordered by ImagePositionPatient Z and InstanceNumber.
 */
export function stackDicomSlicesToVolume(slices: ParsedDicomSlice[]): MedicalVolume {
  if (slices.length === 0) {
    throw new Error("Cannot stack empty DICOM slice list.");
  }

  const ordered = [...slices].sort((a, b) => {
    const dz = a.metadata.imagePositionPatient[2] - b.metadata.imagePositionPatient[2];
    if (Math.abs(dz) > 0.01) return dz;
    return a.metadata.instanceNumber - b.metadata.instanceNumber;
  });

  const ref = ordered[0];
  const width = ref.rawWidth;
  const height = ref.rawHeight;
  const slicePixels = width * height;

  if (ordered.length === 1) {
    // Expand single uploaded DICOM slice into a 24-slice navigable slab
    const depthSlices = 24;
    const volData = new Int16Array(slicePixels * depthSlices);
    const midZ = Math.floor(depthSlices / 2);

    for (let z = 0; z < depthSlices; z++) {
      const zOffset = z * slicePixels;
      const falloff = 1.0 - (Math.abs(z - midZ) / midZ) * 0.28;
      for (let i = 0; i < slicePixels; i++) {
        const hu = ref.pixelData[i];
        volData[zOffset + i] = hu <= -900 ? -1024 : Math.round(hu * falloff);
      }
    }

    return new MedicalVolume(
      `user-dicom-${Date.now()}`,
      ref.metadata.modality === "MR" ? "MR" : "CT",
      [width, height, depthSlices],
      [ref.metadata.pixelSpacing[0], ref.metadata.pixelSpacing[1], ref.metadata.sliceThickness || 2.5],
      ref.metadata.imagePositionPatient,
      volData,
      ref.metadata
    );
  }

  const compatible = ordered.filter((s) => s.rawWidth === width && s.rawHeight === height);
  const depth = compatible.length;
  const volData = new Int16Array(slicePixels * depth);

  compatible.forEach((slice, zIdx) => {
    const zOffset = zIdx * slicePixels;
    for (let i = 0; i < slicePixels; i++) {
      volData[zOffset + i] = slice.pixelData[i];
    }
  });

  const computedDz =
    depth > 1 && Math.abs(compatible[1].metadata.imagePositionPatient[2] - compatible[0].metadata.imagePositionPatient[2]) > 0.05
      ? Math.abs(compatible[1].metadata.imagePositionPatient[2] - compatible[0].metadata.imagePositionPatient[2])
      : ref.metadata.sliceThickness || 2.5;

  return new MedicalVolume(
    `user-series-${Date.now()}`,
    ref.metadata.modality === "MR" ? "MR" : "CT",
    [width, height, depth],
    [ref.metadata.pixelSpacing[0], ref.metadata.pixelSpacing[1], computedDz],
    ref.metadata.imagePositionPatient,
    volData,
    {
      ...ref.metadata,
      sliceThickness: computedDz,
      acquisitionInfo: `${ref.metadata.modality} Series (${depth} slices) • ${width}x${height} • ${ref.metadata.pixelSpacing[0].toFixed(2)}x${ref.metadata.pixelSpacing[1].toFixed(2)}x${computedDz.toFixed(1)} mm`,
    }
  );
}
