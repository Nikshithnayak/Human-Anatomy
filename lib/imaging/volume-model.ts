/**
 * Medical Volume Model & Multiplanar Reconstruction (MPR) Engine
 *
 * Encapsulates 3D volumetric voxel array with physical coordinates,
 * anisotropic spacing, HU window/level mapping, and slice extraction across
 * Axial, Coronal, and Sagittal orthogonal planes.
 */

import type { DicomMetadata } from "./dicom-parser";

export type VolumePlane = "axial" | "coronal" | "sagittal";

export interface WindowPreset {
  name: string;
  windowWidth: number;
  windowCenter: number;
  description: string;
}

export const CLINICAL_WINDOW_PRESETS: Record<string, WindowPreset> = {
  softTissue: {
    name: "Soft Tissue / Abdomen",
    windowWidth: 400,
    windowCenter: 40,
    description: "Optimal contrast for liver, spleen, kidneys, and musculature (400 / 40 HU)",
  },
  bone: {
    name: "Bone / Spine",
    windowWidth: 2000,
    windowCenter: 500,
    description: "High window width for cortical and trabecular osseous detail (2000 / 500 HU)",
  },
  lung: {
    name: "Lung Parenchyma",
    windowWidth: 1500,
    windowCenter: -600,
    description: "Sub-zero negative HU range for pulmonary architecture & air bronchograms (1500 / -600 HU)",
  },
  brain: {
    name: "Brain / Neuro",
    windowWidth: 80,
    windowCenter: 40,
    description: "Narrow window separating gray matter from white matter & edema (80 / 40 HU)",
  },
  mediastinum: {
    name: "Mediastinum / Vessels",
    windowWidth: 350,
    windowCenter: 50,
    description: "Visualizes aortic arch, pulmonary trunk, and pericardial space (350 / 50 HU)",
  },
};

export class MedicalVolume {
  public readonly id: string;
  public readonly modality: "CT" | "MR";
  public readonly dimensions: [number, number, number]; // [width (X), height (Y), depth (Z)]
  public readonly spacing: [number, number, number]; // [dx, dy, dz] in mm
  public readonly origin: [number, number, number]; // [ox, oy, oz] in mm
  public readonly data: Int16Array | Float32Array; // 3D voxel density values in Hounsfield Units
  public readonly metadata: DicomMetadata;

  constructor(
    id: string,
    modality: "CT" | "MR",
    dimensions: [number, number, number],
    spacing: [number, number, number],
    origin: [number, number, number],
    data: Int16Array | Float32Array,
    metadata: DicomMetadata
  ) {
    this.id = id;
    this.modality = modality;
    this.dimensions = dimensions;
    this.spacing = spacing;
    this.origin = origin;
    this.data = data;
    this.metadata = metadata;
  }

  public get width(): number {
    return this.dimensions[0];
  }

  public get height(): number {
    return this.dimensions[1];
  }

  public get depth(): number {
    return this.dimensions[2];
  }

  /**
   * Total physical extents in millimeters: [Lx, Ly, Lz]
   */
  public get physicalSize(): [number, number, number] {
    return [
      this.width * this.spacing[0],
      this.height * this.spacing[1],
      this.depth * this.spacing[2],
    ];
  }

  /**
   * Gets voxel index from 3D coordinates: x ∈ [0, width), y ∈ [0, height), z ∈ [0, depth)
   */
  public getVoxel(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
      return -1024; // Standard air HU
    }
    return this.data[z * (this.width * this.height) + y * this.width + x];
  }

  /**
   * Sets voxel value at 3D coordinate
   */
  public setVoxel(x: number, y: number, z: number, val: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth) {
      this.data[z * (this.width * this.height) + y * this.width + x] = val;
    }
  }

  /**
   * Converts 3D voxel indices to physical millimeter coordinates centered at volume origin
   */
  public voxelToMillimeters(vx: number, vy: number, vz: number): [number, number, number] {
    const halfX = (this.width * this.spacing[0]) / 2;
    const halfY = (this.height * this.spacing[1]) / 2;
    const halfZ = (this.depth * this.spacing[2]) / 2;

    return [
      vx * this.spacing[0] - halfX,
      vy * this.spacing[1] - halfY,
      vz * this.spacing[2] - halfZ,
    ];
  }

  /**
   * Converts physical millimeter coordinates to voxel indices
   */
  public millimetersToVoxel(mx: number, my: number, mz: number): [number, number, number] {
    const halfX = (this.width * this.spacing[0]) / 2;
    const halfY = (this.height * this.spacing[1]) / 2;
    const halfZ = (this.depth * this.spacing[2]) / 2;

    const vx = Math.round((mx + halfX) / this.spacing[0]);
    const vy = Math.round((my + halfY) / this.spacing[1]);
    const vz = Math.round((mz + halfZ) / this.spacing[2]);

    return [
      Math.max(0, Math.min(this.width - 1, vx)),
      Math.max(0, Math.min(this.height - 1, vy)),
      Math.max(0, Math.min(this.depth - 1, vz)),
    ];
  }

  /**
   * Extracts a 2D slice for any orthogonal viewing plane
   */
  public extractSlice(plane: VolumePlane, sliceIndex: number): {
    width: number;
    height: number;
    pixelData: Int16Array;
    aspectRatio: number;
  } {
    if (plane === "axial") {
      const z = Math.max(0, Math.min(this.depth - 1, sliceIndex));
      const sliceSize = this.width * this.height;
      const slice = new Int16Array(sliceSize);
      const offset = z * sliceSize;
      for (let i = 0; i < sliceSize; i++) {
        slice[i] = this.data[offset + i];
      }
      return {
        width: this.width,
        height: this.height,
        pixelData: slice,
        aspectRatio: (this.width * this.spacing[0]) / (this.height * this.spacing[1]),
      };
    } else if (plane === "coronal") {
      const y = Math.max(0, Math.min(this.height - 1, sliceIndex));
      const w = this.width;
      const h = this.depth;
      const slice = new Int16Array(w * h);
      for (let z = 0; z < h; z++) {
        const rowOffset = z * (this.width * this.height) + y * this.width;
        // Invert Z so superior is at the top of coronal view
        const targetRow = (h - 1 - z) * w;
        for (let x = 0; x < w; x++) {
          slice[targetRow + x] = this.data[rowOffset + x];
        }
      }
      return {
        width: w,
        height: h,
        pixelData: slice,
        aspectRatio: (w * this.spacing[0]) / (h * this.spacing[2]),
      };
    } else {
      // Sagittal
      const x = Math.max(0, Math.min(this.width - 1, sliceIndex));
      const w = this.height;
      const h = this.depth;
      const slice = new Int16Array(w * h);
      for (let z = 0; z < h; z++) {
        const targetRow = (h - 1 - z) * w;
        for (let y = 0; y < w; y++) {
          const idx = z * (this.width * this.height) + y * this.width + x;
          slice[targetRow + y] = this.data[idx];
        }
      }
      return {
        width: w,
        height: h,
        pixelData: slice,
        aspectRatio: (w * this.spacing[1]) / (h * this.spacing[2]),
      };
    }
  }

  /**
   * Renders a 2D HU slice onto an HTML Canvas with Window/Level contrast mapping
   */
  public renderSliceToCanvas(
    plane: VolumePlane,
    sliceIndex: number,
    canvas: HTMLCanvasElement,
    windowWidth: number,
    windowCenter: number,
    maskOverlay?: {
      mask: Uint8Array; // 1-byte label ID per voxel
      colorMap: Record<number, [number, number, number, number]>; // labelId -> [r, g, b, alpha]
      opacity: number;
    },
    invert: boolean = false
  ): void {
    const { width, height, pixelData } = this.extractSlice(plane, sliceIndex);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.createImageData(width, height);
    const rgba = imgData.data;

    // Window/Level formula:
    // minVal = center - width / 2
    // maxVal = center + width / 2
    const minVal = windowCenter - windowWidth / 2;
    const maxVal = windowCenter + windowWidth / 2;
    const invWidth = 255.0 / Math.max(1, windowWidth);

    // Extract mask slice if present
    let maskSlice: Uint8Array | null = null;
    if (maskOverlay) {
      maskSlice = this.extractMaskSlice(plane, sliceIndex, maskOverlay.mask);
    }

    const len = width * height;
    for (let i = 0; i < len; i++) {
      const hu = pixelData[i];
      let val = 0;
      if (hu <= minVal) {
        val = 0;
      } else if (hu >= maxVal) {
        val = 255;
      } else {
        val = Math.round((hu - minVal) * invWidth);
      }

      const gray = invert ? 255 - val : val;

      const pixelIdx = i * 4;
      if (maskSlice && maskOverlay && maskSlice[i] > 0) {
        const label = maskSlice[i];
        const color = maskOverlay.colorMap[label] || [240, 80, 80, 0.6];
        const alpha = color[3] * maskOverlay.opacity;
        const invAlpha = 1.0 - alpha;

        rgba[pixelIdx] = Math.round(gray * invAlpha + color[0] * alpha);
        rgba[pixelIdx + 1] = Math.round(gray * invAlpha + color[1] * alpha);
        rgba[pixelIdx + 2] = Math.round(gray * invAlpha + color[2] * alpha);
        rgba[pixelIdx + 3] = 255;
      } else {
        rgba[pixelIdx] = gray;
        rgba[pixelIdx + 1] = gray;
        rgba[pixelIdx + 2] = gray;
        rgba[pixelIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Extracts a 2D slice from a 3D mask volume
   */
  private extractMaskSlice(plane: VolumePlane, sliceIndex: number, fullMask: Uint8Array): Uint8Array {
    if (plane === "axial") {
      const z = Math.max(0, Math.min(this.depth - 1, sliceIndex));
      const sliceSize = this.width * this.height;
      return fullMask.subarray(z * sliceSize, (z + 1) * sliceSize);
    } else if (plane === "coronal") {
      const y = Math.max(0, Math.min(this.height - 1, sliceIndex));
      const w = this.width;
      const h = this.depth;
      const slice = new Uint8Array(w * h);
      for (let z = 0; z < h; z++) {
        const rowOffset = z * (this.width * this.height) + y * this.width;
        const targetRow = (h - 1 - z) * w;
        for (let x = 0; x < w; x++) {
          slice[targetRow + x] = fullMask[rowOffset + x];
        }
      }
      return slice;
    } else {
      const x = Math.max(0, Math.min(this.width - 1, sliceIndex));
      const w = this.height;
      const h = this.depth;
      const slice = new Uint8Array(w * h);
      for (let z = 0; z < h; z++) {
        const targetRow = (h - 1 - z) * w;
        for (let y = 0; y < w; y++) {
          const idx = z * (this.width * this.height) + y * this.width + x;
          slice[targetRow + y] = fullMask[idx];
        }
      }
      return slice;
    }
  }
}
