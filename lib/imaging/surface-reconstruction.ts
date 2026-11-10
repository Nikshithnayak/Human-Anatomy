/**
 * Patient-Specific 3D Surface Reconstruction Engine
 *
 * Transforms 3D segmentation voxel masks into smooth, cinematic THREE.BufferGeometry
 * meshes with physical millimeter coordinates, organic Laplacian-smoothed vertex normals,
 * and high-fidelity anatomical physical materials (MeshPhysicalMaterial).
 */

import * as THREE from "three";
import type { MedicalVolume } from "./volume-model";
import type { AnatomicalStructureDefinition, SegmentationResult } from "./segmentation-engine";

export interface ReconstructedStructureMesh {
  structure: AnatomicalStructureDefinition;
  geometry: THREE.BufferGeometry;
  mesh: THREE.Mesh;
  voxelCount: number;
  volumeCc: number;
  bounds: THREE.Box3;
}

export interface ReconstructionResult {
  volumeId: string;
  structures: ReconstructedStructureMesh[];
  combinedBounds: THREE.Box3;
  totalVertices: number;
  totalTriangles: number;
  scaleMmToScene: number; // Conversion factor: physical mm to Three.js world units
}

export type ShadingPreset = "photorealistic" | "glass" | "density";

/**
 * Creates high-fidelity anatomical physical materials tailored to specific tissue optics
 */
export function createAnatomicalMaterial(
  structure: AnatomicalStructureDefinition,
  preset: ShadingPreset = "photorealistic"
): THREE.Material {
  const [r, g, b] = structure.defaultColor;
  const baseColor = new THREE.Color(r / 255, g / 255, b / 255);
  const sys = structure.system.toLowerCase();
  const id = structure.id.toLowerCase();

  if (preset === "glass") {
    // Radiologic Glass / CT Workstation mode:
    // Bones stay opaque ivory; visceral organs become translucent frosted glass
    const isBone = sys === "skeletal" || id.includes("bone") || id.includes("spine") || id.includes("rib");
    if (isBone) {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xf6f3ea), // Solid cortical ivory
        roughness: 0.3,
        metalness: 0.05,
        clearcoat: 0.45,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide,
      });
    }

    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: 0.15,
      metalness: 0.05,
      transmission: 0.75, // Semi-transparent glass
      opacity: 0.4,
      transparent: true,
      ior: 1.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  if (preset === "density") {
    // False-color glowing density heatmap
    let heatColor = new THREE.Color(0x38bdf8); // Sky blue
    if (sys === "skeletal" || id.includes("bone")) heatColor = new THREE.Color(0xfbbf24); // Gold for dense bone
    else if (id.includes("aorta") || id.includes("heart")) heatColor = new THREE.Color(0xf43f5e); // Hot rose
    else if (id.includes("liver")) heatColor = new THREE.Color(0x34d399); // Emerald

    return new THREE.MeshStandardMaterial({
      color: heatColor,
      roughness: 0.25,
      metalness: 0.15,
      emissive: heatColor.clone().multiplyScalar(0.22),
      side: THREE.DoubleSide,
    });
  }

  // 1. Skeletal Bone (Cortical bone ivory)
  if (sys === "skeletal" || id.includes("bone") || id.includes("spine") || id.includes("rib")) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xf6f3e6),
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.38,
      clearcoatRoughness: 0.22,
      sheen: 0.15,
      sheenColor: new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
    });
  }

  // 2. Cardiovascular (Glossy arterial ruby)
  if (id.includes("aorta") || id.includes("heart") || id.includes("artery") || id.includes("vein")) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xdc2626),
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
      transmission: 0.1,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xfca5a5),
      emissive: new THREE.Color(0x280505),
      side: THREE.DoubleSide,
    });
  }

  // 3. Pulmonary Parenchyma (Lungs)
  if (id.includes("lung")) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x38bdf8),
      roughness: 0.45,
      metalness: 0.05,
      clearcoat: 0.25,
      opacity: 0.82,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  // 4. Hepatic / Visceral Organs (Liver, Kidneys, Spleen)
  if (id.includes("liver")) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xb45309),
      roughness: 0.28,
      metalness: 0.06,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    });
  }

  if (id.includes("kidney")) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x9f1239),
      roughness: 0.26,
      metalness: 0.06,
      clearcoat: 0.52,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    });
  }

  // Default Photorealistic Organic Material
  return new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
    side: THREE.DoubleSide,
  });
}

/**
 * Reconstructs 3D surface meshes from segmentation mask for all segmented structures
 * with Laplacian smoothing and organic normal estimation.
 */
export function reconstructSurfacesFromSegmentation(
  volume: MedicalVolume,
  segmentation: SegmentationResult,
  options: {
    downsampleFactor?: number; // 1 = full resolution, 2 = 2x downsample for high FPS
    smoothingPasses?: number;
    scaleMmToScene?: number; // Default: 0.01 (100mm = 1 Three.js unit)
    shadingPreset?: ShadingPreset;
  } = {}
): ReconstructionResult {
  const downsample = Math.max(1, options.downsampleFactor ?? (volume.width > 256 ? 2 : 1));
  const smoothPasses = options.smoothingPasses ?? 2;
  const scale = options.scaleMmToScene ?? 0.01;
  const preset = options.shadingPreset ?? "photorealistic";

  const w = volume.width;
  const h = volume.height;
  const d = volume.depth;
  const mask = segmentation.mask;

  const reconstructed: ReconstructedStructureMesh[] = [];
  const combinedBounds = new THREE.Box3();
  let totalVertices = 0;
  let totalTriangles = 0;

  // Directional offsets for 6-neighborhood voxel boundary test
  const neighbors = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  // 4 corners of unit quad for each face direction [c0, c1, c2, c3]
  // Two triangles: (0, 1, 2) and (0, 2, 3) with CCW outward normals
  const faceCorners: Record<number, number[][]> = {
    0: [ [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1] ], // +X
    1: [ [0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0] ], // -X
    2: [ [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0] ], // +Y
    3: [ [0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1] ], // -Y
    4: [ [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1] ], // +Z
    5: [ [0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0] ], // -Z
  };

  const isInside = (x: number, y: number, z: number, label: number): boolean => {
    if (x < 0 || x >= w || y < 0 || y >= h || z < 0 || z >= d) return false;
    return mask[z * (w * h) + y * w + x] === label;
  };

  // Process each segmented structure individually
  for (const structure of segmentation.structures) {
    const label = structure.labelIndex;
    const vertexMap = new Map<string, number>();
    const rawVertices: number[][] = [];
    const indices: number[] = [];
    const adjacency: Set<number>[] = [];

    const getOrAddVertex = (vx: number, vy: number, vz: number): number => {
      // Key with discrete resolution
      const kx = Math.round(vx * 2);
      const ky = Math.round(vy * 2);
      const kz = Math.round(vz * 2);
      const key = `${kx}_${ky}_${kz}`;

      let idx = vertexMap.get(key);
      if (idx === undefined) {
        idx = rawVertices.length;
        rawVertices.push([vx, vy, vz]);
        vertexMap.set(key, idx);
        adjacency.push(new Set<number>());
      }
      return idx;
    };

    const addEdge = (v1: number, v2: number) => {
      if (v1 !== v2) {
        adjacency[v1].add(v2);
        adjacency[v2].add(v1);
      }
    };

    // Scan volume with step size = downsample
    for (let z = 0; z < d; z += downsample) {
      for (let y = 0; y < h; y += downsample) {
        for (let x = 0; x < w; x += downsample) {
          const idx = z * (w * h) + y * w + x;
          if (mask[idx] !== label) continue;

          // Check all 6 faces: if neighbor is not this label, emit boundary quad
          for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
            const [nx, ny, nz] = neighbors[faceIdx];
            const checkX = x + nx * downsample;
            const checkY = y + ny * downsample;
            const checkZ = z + nz * downsample;

            if (!isInside(checkX, checkY, checkZ, label)) {
              const corners = faceCorners[faceIdx];
              const quadIndices: number[] = [];

              for (let c = 0; c < 4; c++) {
                const [ox, oy, oz] = corners[c];
                const vx = x + (ox - 0.5) * downsample;
                const vy = y + (oy - 0.5) * downsample;
                const vz = z + (oz - 0.5) * downsample;
                quadIndices.push(getOrAddVertex(vx, vy, vz));
              }

              // Two triangles: (0, 1, 2) and (0, 2, 3)
              const [i0, i1, i2, i3] = quadIndices;
              indices.push(i0, i1, i2);
              indices.push(i0, i2, i3);

              // Adjacency edges
              addEdge(i0, i1);
              addEdge(i1, i2);
              addEdge(i2, i3);
              addEdge(i3, i0);
              addEdge(i0, i2);
            }
          }
        }
      }
    }

    if (rawVertices.length === 0 || indices.length === 0) continue;

    // Laplacian Smoothing for organic anatomical curves
    const smoothed = rawVertices.map((v) => [...v]);
    const lambda = 0.38;

    for (let pass = 0; pass < smoothPasses; pass++) {
      for (let vIdx = 0; vIdx < rawVertices.length; vIdx++) {
        const neighborsSet = adjacency[vIdx];
        if (!neighborsSet || neighborsSet.size === 0) continue;

        let avgX = 0;
        let avgY = 0;
        let avgZ = 0;
        neighborsSet.forEach((nIdx) => {
          avgX += smoothed[nIdx][0];
          avgY += smoothed[nIdx][1];
          avgZ += smoothed[nIdx][2];
        });
        const count = neighborsSet.size;
        avgX /= count;
        avgY /= count;
        avgZ /= count;

        smoothed[vIdx][0] += lambda * (avgX - smoothed[vIdx][0]);
        smoothed[vIdx][1] += lambda * (avgY - smoothed[vIdx][1]);
        smoothed[vIdx][2] += lambda * (avgZ - smoothed[vIdx][2]);
      }
    }

    // Convert smoothed positions to Three.js physical coordinates
    const finalPositions: number[] = new Array(smoothed.length * 3);
    for (let vIdx = 0; vIdx < smoothed.length; vIdx++) {
      const [vx, vy, vz] = smoothed[vIdx];
      const [mx, my, mz] = volume.voxelToMillimeters(vx, vy, vz);
      // Standard anatomical orientation: X = right/left, Y = superior/inferior, Z = anterior/posterior
      finalPositions[vIdx * 3] = mx * scale;
      finalPositions[vIdx * 3 + 1] = mz * scale;
      finalPositions[vIdx * 3 + 2] = -my * scale;
    }

    // Create BufferGeometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(finalPositions, 3));
    geometry.setIndex(indices);

    // Compute silky smooth area-weighted vertex normals
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    // High-fidelity physical material tailored to tissue
    const material = createAnatomicalMaterial(structure, preset);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `patient-${structure.id}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Attach rich metadata for raycasting & structure inspector
    mesh.userData = {
      structureId: structure.id,
      structureName: structure.name,
      system: structure.system,
      organId: structure.organId,
      fmaConceptId: structure.fmaConceptId,
      voxelCount: segmentation.voxelCountPerStructure[structure.id] || 0,
      volumeCc: segmentation.volumeCcPerStructure[structure.id] || 0,
    };

    if (geometry.boundingBox) {
      combinedBounds.union(geometry.boundingBox);
    }

    const triCount = indices.length / 3;
    totalVertices += smoothed.length;
    totalTriangles += triCount;

    reconstructed.push({
      structure,
      geometry,
      mesh,
      voxelCount: segmentation.voxelCountPerStructure[structure.id] || 0,
      volumeCc: segmentation.volumeCcPerStructure[structure.id] || 0,
      bounds: geometry.boundingBox || new THREE.Box3(),
    });
  }

  return {
    volumeId: volume.id,
    structures: reconstructed,
    combinedBounds,
    totalVertices,
    totalTriangles,
    scaleMmToScene: scale,
  };
}
