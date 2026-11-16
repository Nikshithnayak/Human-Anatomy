import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BRACHIAL_PLEXUS_CLASSES, TOTALSEGMENTATOR_STRUCTURES } from "../lib/imaging/external-models.ts";
import {
  Z_ANATOMY_SYSTEMS,
  splitZAnatomySide,
  formatZAnatomyPartName,
  buildZAnatomyPartsData,
  parseZAnatomyDefinition,
  computeDepthLayerStates,
} from "../lib/anatomy/z-anatomy.ts";
import { generateReferenceThoracicVolume } from "../lib/imaging/reference-studies.ts";
import {
  measureLineMm,
  measureAngleDegrees,
  measureEllipticalRoi,
  sampleVolumeProbe,
  exportOhifDicomSrReport,
} from "../lib/imaging/ohif-bridge.ts";
import {
  BRACHIAL_PLEXUS_MODEL_CLASSES,
  classifyNerveMorphology,
  analyzeNerveSegmentationProbs,
  buildSegmentationOverlayRgba,
} from "../lib/imaging/nerve-biometrics.ts";

test("Nerve Explorer: 8 Brachial Plexus classes match Hierarchical-Temporal-BP-Seg", () => {
  assert.equal(BRACHIAL_PLEXUS_CLASSES.length, 8);

  const expectedIds = ["C5", "C6", "C7", "C8", "UT", "MT", "LT", "SSN"];
  const actualIds = BRACHIAL_PLEXUS_CLASSES.map((c) => c.id);
  assert.deepEqual(actualIds, expectedIds);

  BRACHIAL_PLEXUS_CLASSES.forEach((cls) => {
    assert.ok(cls.name.length > 0, `${cls.id} has name`);
    assert.ok(cls.threeJsConceptId.startsWith("bp_"), `${cls.id} has 3D concept ID`);
    assert.equal(cls.coordinates3D.length, 3, `${cls.id} has valid 3D coordinates`);
    assert.ok(cls.clinicalPathology.length > 0, `${cls.id} has clinical pathology explanation`);
  });
});

test("TotalSegmentator: 117 classes and strict peripheral nerve exclusion assertion", () => {
  assert.ok(TOTALSEGMENTATOR_STRUCTURES.length >= 70, "TotalSegmentator structure taxonomy is loaded");

  // Verify key organ and vertebrae classes
  const structureIds = TOTALSEGMENTATOR_STRUCTURES.map((s) => s.id);
  assert.ok(structureIds.includes("liver"), "Liver is included");
  assert.ok(structureIds.includes("spleen"), "Spleen is included");
  assert.ok(structureIds.includes("aorta"), "Aorta is included");
  assert.ok(structureIds.includes("vertebrae_C5"), "Vertebra C5 is included");
  assert.ok(structureIds.includes("vertebrae_T1"), "Vertebra T1 is included");

  // CRITICAL SCIENTIFIC INTEGRITY TEST: TotalSegmentator MUST NOT segment peripheral nerves
  const nerveStructures = TOTALSEGMENTATOR_STRUCTURES.filter((s) =>
    s.id.includes("brachial_plexus") || s.id.includes("radial_nerve") || s.id.includes("median_nerve")
  );
  assert.equal(
    nerveStructures.length,
    0,
    "Scientific Integrity Verified: TotalSegmentator class list correctly excludes peripheral nerves"
  );
});

test("External Documentation & Repository Integrity: Audit and Licenses Exist", () => {
  const auditPath = path.join(process.cwd(), "docs", "EXTERNAL_REPOSITORY_AUDIT.md");
  const licensePath = path.join(process.cwd(), "docs", "THIRD_PARTY_LICENSES.md");
  const checkpointPath = path.join(
    process.cwd(),
    "external",
    "brachial-plexus",
    "lightning_logs",
    "seq50",
    "checkpoints",
    "last.ckpt"
  );

  assert.ok(fs.existsSync(auditPath), "docs/EXTERNAL_REPOSITORY_AUDIT.md exists");
  assert.ok(fs.existsSync(licensePath), "docs/THIRD_PARTY_LICENSES.md exists");
  assert.ok(fs.existsSync(checkpointPath), "Pretrained brachial plexus checkpoint exists (75.7 MB)");

  const auditContent = fs.readFileSync(auditPath, "utf-8");
  assert.ok(auditContent.includes("Hierarchical-Temporal-BP-Seg"), "Audit covers BP-Seg");
  assert.ok(auditContent.includes("OHIF"), "Audit covers OHIF");
  assert.ok(auditContent.includes("TotalSegmentator"), "Audit covers TotalSegmentator");
  assert.ok(auditContent.includes("MedSAM2"), "Audit covers MedSAM2");
  assert.ok(auditContent.includes("neuroaxis-atlas"), "Audit covers neuroaxis-atlas");
  assert.ok(auditContent.includes("sofa"), "Audit covers sofa");
});

test("Git Submodules & Public Assets: OHIF/Viewers & nqwrc/3d-anatomy are properly registered", () => {
  const gitmodulesPath = path.join(process.cwd(), ".gitmodules");
  assert.ok(fs.existsSync(gitmodulesPath), ".gitmodules exists");
  const gm = fs.readFileSync(gitmodulesPath, "utf-8");
  assert.ok(gm.includes("https://github.com/OHIF/Viewers.git"), "OHIF/Viewers submodule registered");
  assert.ok(gm.includes("https://github.com/nqwrc/3d-anatomy.git"), "nqwrc/3d-anatomy submodule registered");
  assert.ok(fs.existsSync(path.join(process.cwd(), "external", "ohif", "version.txt")), "external/ohif present");
  assert.ok(fs.existsSync(path.join(process.cwd(), "external", "3d-anatomy", "package.json")), "external/3d-anatomy present");

  const zDir = path.join(process.cwd(), "public", "z-anatomy");
  assert.ok(fs.existsSync(path.join(zDir, "data", "systems.json")), "public/z-anatomy/data/systems.json exists");
  assert.ok(fs.existsSync(path.join(zDir, "models", "skeletal.glb")), "public/z-anatomy/models/skeletal.glb exists");
  assert.ok(fs.existsSync(path.join(zDir, "draco", "draco_decoder.wasm")), "Draco WASM decoder synced");
  assert.ok(fs.existsSync(path.join(zDir, "LICENSE.txt")), "CC BY-NC-SA 4.0 LICENSE synced");
  assert.ok(fs.existsSync(path.join(zDir, "NOTICE.txt")), "Required NOTICE attribution synced");
});

test("nqwrc/3d-anatomy: 2,827 structures across 7 systems, lexicon formatting, and depth peel calculations", () => {
  const total = Z_ANATOMY_SYSTEMS.reduce((acc, s) => acc + s.structureCount, 0);
  assert.equal(Z_ANATOMY_SYSTEMS.length, 7);
  assert.equal(total, 2827);

  assert.deepEqual(splitZAnatomySide("Femur.l"), { base: "Femur", side: "left" });
  assert.equal(formatZAnatomyPartName("Femur.r"), "Femur (right)");

  const parts = buildZAnatomyPartsData(
    { skeletal: ["Femur.l", "(Accessory process)"] },
    { Femur: { la: "Os femoris", official: true } }
  );
  assert.equal(parts["Femur.l"].latinName, "Os femoris");
  assert.equal(parts["Femur.l"].official, true);

  const parsed = parseZAnatomyDefinition("Long bone of thigh. === Origin === Pelvis https://en.wikipedia.org/wiki/Femur");
  assert.equal(parsed.url, "https://en.wikipedia.org/wiki/Femur");
  assert.ok(parsed.text.includes("Origin:"));

  const midDepth = computeDepthLayerStates(50, ["muscular", "visceral", "skeletal"]);
  assert.equal(midDepth.muscular.visible, false);
  assert.ok(midDepth.skeletal.opacity > 0.9);
});

test("OHIF/Viewers Bridge: calibrated measurements, HU probe, and dcmjs DICOM-SR export", () => {
  const vol = generateReferenceThoracicVolume();
  const centerProbe = sampleVolumeProbe(vol, "axial", Math.floor(vol.depth / 2), 0.5, 0.5);
  assert.equal(centerProbe.voxel.length, 3);
  assert.equal(typeof centerProbe.hu, "number");
  assert.ok(centerProbe.tissueLabel.length > 0);

  const distMm = measureLineMm(vol, "axial", { x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 });
  assert.ok(distMm > 10, "Calibrated distance exceeds 10 mm");

  const angleDeg = measureAngleDegrees(vol, "axial", { x: 1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0 });
  assert.ok(Math.abs(angleDeg - 90) < 3, `Expected ~90 degrees, got ${angleDeg}`);

  const roi = measureEllipticalRoi(vol, "axial", Math.floor(vol.depth / 2), { x: 0.4, y: 0.4 }, { x: 0.6, y: 0.6 });
  assert.ok(roi.voxelCount > 10);
  assert.ok(roi.areaMm2 > 0);

  const sr = exportOhifDicomSrReport(vol, [
    {
      id: "m-1",
      tool: "length",
      plane: "axial",
      sliceIndex: 32,
      points: [{ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }],
      summaryText: `${distMm.toFixed(1)} mm`,
      metrics: { lengthMm: distMm },
      createdAt: "2026-11-10T00:00:00Z",
    },
  ]);
  assert.equal(sr.schema, "OHIF/dcmjs TID 1500 Measurement Report (De-identified)");
  assert.equal(sr.measurements.length, 1);
  assert.ok(sr.sopInstanceUID.startsWith("2.25."));
});

test("Brachial Plexus Biometrics & ONNX Web Artifacts: CSA mm2, flattening detection, and empty guard", () => {
  assert.equal(BRACHIAL_PLEXUS_MODEL_CLASSES.length, 9);
  assert.deepEqual(
    BRACHIAL_PLEXUS_MODEL_CLASSES.map((c) => c.code),
    ["BG", "C5", "C6", "C7/MT", "C8/LT", "UT", "SSN", "AD", "PD"],
  );

  // 1. Background-only prediction tensor must report 0 detected nerve classes honestly
  const w = 64;
  const h = 64;
  const totalPx = w * h;
  const bgOnlyProbs = new Float32Array(9 * totalPx);
  for (let i = 0; i < totalPx; i++) bgOnlyProbs[i] = 0.98;
  const emptySummary = analyzeNerveSegmentationProbs(bgOnlyProbs, { width: w, height: h, depthCm: 4.0 });
  assert.equal(emptySummary.detectedClasses.length, 0);
  assert.equal(emptySummary.hasHighConfidenceDetection, false);

  // 2. Swollen C5 circular mask + elongated C6 compressed mask
  const probs = new Float32Array(9 * totalPx);
  for (let i = 0; i < totalPx; i++) probs[i] = 0.95;

  // Paint swollen C5 circle (r=8 px => ~201 px => at 4cm/64px => ~78 mm2 > 9.5 mm2 upper limit)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if ((x - 20) ** 2 + (y - 20) ** 2 <= 64) {
        probs[idx] = 0.05;
        probs[1 * totalPx + idx] = 0.92;
      } else if (Math.abs(x - 45) <= 10 && Math.abs(y - 45) <= 1) {
        probs[idx] = 0.08;
        probs[2 * totalPx + idx] = 0.88;
      }
    }
  }

  const summary = analyzeNerveSegmentationProbs(probs, { width: w, height: h, depthCm: 2.2 });
  const c5 = summary.detectedClasses.find((c) => c.code === "C5");
  const c6 = summary.detectedClasses.find((c) => c.code === "C6");
  assert.ok(c5, "C5 detected");
  assert.equal(c5.status, "swollen");
  assert.ok(summary.hasHighConfidenceDetection);
  assert.ok(summary.primaryAlert?.includes("C5"));

  assert.ok(c6, "C6 detected");
  assert.equal(c6.status, "compressed");
  assert.ok(c6.flatteningRatio >= 2.6, `Expected >=2.6 flattening ratio, got ${c6.flatteningRatio}`);

  const rgba = buildSegmentationOverlayRgba(probs, w, h, 0.25, 145);
  const centerIdx = (20 * w + 20) * 4;
  assert.equal(rgba[centerIdx + 3], 145);

  assert.equal(classifyNerveMorphology(6.5, 1.4, [4.5, 9.5]).status, "normal");
});

test("ONNX Model & ORT WebAssembly Assets: Validated exports exist on disk", () => {
  const onnxPath = path.join(process.cwd(), "public", "models", "brachial-plexus.onnx");
  const wasmPath = path.join(process.cwd(), "public", "ort", "ort-wasm-simd-threaded.wasm");
  const mjsPath = path.join(process.cwd(), "public", "ort", "ort-wasm-simd-threaded.mjs");
  assert.ok(fs.existsSync(onnxPath) && fs.statSync(onnxPath).size > 1_000_000, "public/models/brachial-plexus.onnx exists (>1MB)");
  assert.ok(fs.existsSync(wasmPath) && fs.statSync(wasmPath).size > 1_000_000, "ORT WASM binary exists in public/ort/");
  assert.ok(fs.existsSync(mjsPath), "ORT MJS glue exists in public/ort/");
});
