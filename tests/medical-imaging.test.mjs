import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  isDicomFile,
  parseDicomSlice,
  generateDeidentifiedCaseId,
  extractEmbeddedImageBlob,
} from "../lib/imaging/dicom-parser.ts";
import {
  MedicalVolume,
  CLINICAL_WINDOW_PRESETS,
} from "../lib/imaging/volume-model.ts";
import {
  HounsfieldThresholdProvider,
  SUPPORTED_STRUCTURES,
} from "../lib/imaging/segmentation-engine.ts";
import { reconstructSurfacesFromSegmentation } from "../lib/imaging/surface-reconstruction.ts";
import {
  generateReferenceThoracicVolume,
  generateReferenceAbdominalVolume,
  REFERENCE_STUDIES,
} from "../lib/imaging/reference-studies.ts";

test("DICOM Parser: Detects Part 10 magic bytes and enforces client-side de-identification", () => {
  // Test case ID generation
  const id1 = generateDeidentifiedCaseId("test-seed-1");
  const id2 = generateDeidentifiedCaseId("test-seed-2");
  assert.match(id1, /^ANAT-2026-\d{4}$/);
  assert.match(id2, /^ANAT-2026-\d{4}$/);

  // Buffer without DICM header at byte 128
  const invalidBuffer = new ArrayBuffer(200);
  assert.equal(isDicomFile(invalidBuffer), false);
  assert.throws(() => parseDicomSlice(invalidBuffer), /missing DICM header/);

  // Buffer with valid DICM magic bytes at byte 128
  const validBuffer = new ArrayBuffer(256);
  const view = new Uint8Array(validBuffer);
  view[128] = 0x44; // 'D'
  view[129] = 0x49; // 'I'
  view[130] = 0x43; // 'C'
  view[131] = 0x4d; // 'M'
  assert.equal(isDicomFile(validBuffer), true);
});

test("MedicalVolume: Physical coordinate conversion and multiplanar slice extraction", () => {
  const thoracic = generateReferenceThoracicVolume();

  assert.equal(thoracic.modality, "CT");
  assert.equal(thoracic.width, 128);
  assert.equal(thoracic.height, 128);
  assert.equal(thoracic.depth, 64);
  assert.equal(thoracic.metadata.deidentifiedCaseId, "ANAT-2026-THORAX-REF");

  // Voxel to Millimeters round-trip
  const [mx, my, mz] = thoracic.voxelToMillimeters(64, 64, 32);
  const [vx, vy, vz] = thoracic.millimetersToVoxel(mx, my, mz);
  assert.equal(vx, 64);
  assert.equal(vy, 64);
  assert.equal(vz, 32);

  // Multiplanar slice extraction
  const axial = thoracic.extractSlice("axial", 32);
  assert.equal(axial.width, 128);
  assert.equal(axial.height, 128);
  assert.equal(axial.pixelData.length, 128 * 128);

  const coronal = thoracic.extractSlice("coronal", 64);
  assert.equal(coronal.width, 128);
  assert.equal(coronal.height, 64);
  assert.equal(coronal.pixelData.length, 128 * 64);

  const sagittal = thoracic.extractSlice("sagittal", 64);
  assert.equal(sagittal.width, 128);
  assert.equal(sagittal.height, 64);
  assert.equal(sagittal.pixelData.length, 128 * 64);

  // Presets
  assert.ok(CLINICAL_WINDOW_PRESETS.bone);
  assert.equal(CLINICAL_WINDOW_PRESETS.bone.windowWidth, 2000);
  assert.equal(CLINICAL_WINDOW_PRESETS.bone.windowCenter, 500);
  assert.equal(CLINICAL_WINDOW_PRESETS.lung.windowCenter, -600);
});

test("Segmentation Pipeline: Physical HU density thresholding with spatial region constraints", async () => {
  const thoracic = generateReferenceThoracicVolume();
  const engine = new HounsfieldThresholdProvider();

  const result = await engine.segment(thoracic, {
    structures: ["bone-spine", "bone-ribs", "lungs-bilateral", "heart-mediastinum"],
    algorithm: "hu-threshold",
  });

  assert.equal(result.volumeId, thoracic.id);
  assert.equal(result.structures.length, 4);
  assert.ok(result.mask.length === thoracic.width * thoracic.height * thoracic.depth);

  // Verify non-zero segmentations
  assert.ok(result.voxelCountPerStructure["bone-spine"] > 0);
  assert.ok(result.voxelCountPerStructure["bone-ribs"] > 0);
  assert.ok(result.voxelCountPerStructure["lungs-bilateral"] > 0);
  assert.ok(result.voxelCountPerStructure["heart-mediastinum"] > 0);

  // Verify volume cc calculations
  assert.ok(result.volumeCcPerStructure["bone-spine"] > 0);
  assert.ok(result.volumeCcPerStructure["lungs-bilateral"] > 0);
  assert.match(result.disclaimer, /Educational research/i);
});

test("3D Surface Reconstruction: Generates inspectable Three.js BufferGeometry meshes", async () => {
  const thoracic = generateReferenceThoracicVolume();
  const engine = new HounsfieldThresholdProvider();

  const segmentation = await engine.segment(thoracic, {
    structures: ["bone-spine", "lungs-bilateral"],
    algorithm: "hu-threshold",
  });

  const reconstruction = reconstructSurfacesFromSegmentation(thoracic, segmentation, {
    downsampleFactor: 2,
    smoothingPasses: 1,
    scaleMmToScene: 0.01,
  });

  assert.equal(reconstruction.structures.length, 2);
  assert.ok(reconstruction.totalVertices > 0);
  assert.ok(reconstruction.totalTriangles > 0);
  assert.ok(reconstruction.combinedBounds.isEmpty() === false);

  // Inspect first structure mesh
  const spineMesh = reconstruction.structures[0];
  assert.equal(spineMesh.structure.id, "bone-spine");
  assert.ok(spineMesh.geometry instanceof THREE.BufferGeometry);
  assert.ok(spineMesh.geometry.getAttribute("position"));
  assert.ok(spineMesh.geometry.getAttribute("normal"));

  // Check userData attached for interactive raycasting
  assert.equal(spineMesh.mesh.userData.structureId, "bone-spine");
  assert.equal(spineMesh.mesh.userData.system, "skeletal");
  assert.ok(spineMesh.mesh.userData.volumeCc > 0);
});

test("Reference Studies: Curated Thoracic and Abdominal volumes are anatomically calibrated", () => {
  assert.equal(REFERENCE_STUDIES.length, 2);

  const [thoraxStudy, abdomenStudy] = REFERENCE_STUDIES;
  assert.equal(thoraxStudy.id, "study-ct-thorax");
  assert.equal(thoraxStudy.anatomyRegion, "Thorax");
  assert.equal(abdomenStudy.id, "study-ct-abdomen");
  assert.equal(abdomenStudy.anatomyRegion, "Abdomen & Retroperitoneum");

  const abdomenVol = generateReferenceAbdominalVolume();
  assert.equal(abdomenVol.width, 128);
  assert.equal(abdomenVol.depth, 64);
  assert.ok(abdomenVol.data.length > 0);
});

test("Anatomical Body Mapper: Classifies scan region, body Z-height, and detected structures", async () => {
  const { analyzeScanAnatomy, analyzeMedicalVolumeAnatomy } = await import("../lib/imaging/image-to-volume.ts");
  const thoracic = generateReferenceThoracicVolume();

  const thoraxReport = analyzeMedicalVolumeAnatomy(thoracic);
  assert.equal(thoraxReport.region, "Thorax");
  assert.equal(thoraxReport.bodyZNormalized, 0.68);
  assert.ok(thoraxReport.detectedStructures.length > 0);
  assert.ok(thoraxReport.explanation.length > 10);

  const abdominal = generateReferenceAbdominalVolume();
  const abdomenReport = analyzeMedicalVolumeAnatomy(abdominal);
  assert.equal(abdomenReport.region, "Abdomen");
  assert.equal(abdomenReport.bodyZNormalized, 0.52);
  assert.ok(abdomenReport.detectedStructures.some((s) => s.structureId === "liver" || s.structureId === "bone-spine"));
});

test("Embedded Image Extraction: Recovers JPEG, PNG, and WebP from encapsulated DICOM buffers", () => {
  // Test JPEG detection
  const jpegBuf = new ArrayBuffer(64);
  const jpegView = new Uint8Array(jpegBuf);
  jpegView[10] = 0xff;
  jpegView[11] = 0xd8;
  jpegView[12] = 0xff;
  jpegView[30] = 0xff;
  jpegView[31] = 0xd9;
  const jpegBlob = extractEmbeddedImageBlob(jpegBuf);
  assert.ok(jpegBlob);
  assert.equal(jpegBlob.type, "image/jpeg");

  // Test PNG detection
  const pngBuf = new ArrayBuffer(64);
  const pngView = new Uint8Array(pngBuf);
  pngView[8] = 0x89;
  pngView[9] = 0x50;
  pngView[10] = 0x4e;
  pngView[11] = 0x47;
  const pngBlob = extractEmbeddedImageBlob(pngBuf);
  assert.ok(pngBlob);
  assert.equal(pngBlob.type, "image/png");

  // Test WebP detection
  const webpBuf = new ArrayBuffer(64);
  const webpView = new Uint8Array(webpBuf);
  webpView[0] = 0x52; webpView[1] = 0x49; webpView[2] = 0x46; webpView[3] = 0x46; // RIFF
  webpView[8] = 0x57; webpView[9] = 0x45; webpView[10] = 0x42; webpView[11] = 0x50; // WEBP
  const webpBlob = extractEmbeddedImageBlob(webpBuf);
  assert.ok(webpBlob);
  assert.equal(webpBlob.type, "image/webp");

  // Random non-image binary returns null
  const emptyBuf = new ArrayBuffer(32);
  assert.equal(extractEmbeddedImageBlob(emptyBuf), null);
});
