import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  filterRadiologyDatasets,
  getCalibratedBenchmarkDatasets,
  getFineTuningProfile,
  getRadiologyHubMetrics,
  BENCHMARK_STUDY_MAP,
} from "../lib/imaging/radiology-hub/dataset-hub-service.ts";

test("Radiology Dataset Hub: Local JSON catalog integrity and vocab validation", () => {
  const jsonPath = path.resolve(process.cwd(), "public/data/radiology-datasets.json");
  assert.ok(fs.existsSync(jsonPath), "public/data/radiology-datasets.json must exist");

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const datasets = JSON.parse(raw);
  assert.ok(Array.isArray(datasets));
  assert.equal(datasets.length, 474, "Must contain all 474 curated datasets from Jung Oh Lee hub");

  // Check required schema fields on first 10 datasets
  for (const d of datasets.slice(0, 10)) {
    assert.ok(d.id, "Dataset must have id");
    assert.ok(d.name, "Dataset must have name");
    assert.ok(Array.isArray(d.modality), "Dataset must have modality array");
    assert.ok(Array.isArray(d.regions), "Dataset must have regions array");
    assert.ok(d.url, "Dataset must have url");
  }

  // Vocab validation
  const vocabPath = path.resolve(process.cwd(), "public/data/radiology-vocab.json");
  assert.ok(fs.existsSync(vocabPath));
  const vocab = JSON.parse(fs.readFileSync(vocabPath, "utf-8"));
  assert.ok(vocab.modality.includes("CT"));
  assert.ok(vocab.modality.includes("MRI"));
  assert.ok(vocab.regions.includes("Neuro"));
  assert.ok(vocab.regions.includes("Chest"));
});

test("Radiology Dataset Hub: Search and Facet Filtering Engine", () => {
  const jsonPath = path.resolve(process.cwd(), "public/data/radiology-datasets.json");
  const datasets = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // 1. Filter by text query
  const bratsResults = filterRadiologyDatasets(datasets, { query: "BraTS" });
  assert.ok(bratsResults.length > 0);
  assert.ok(bratsResults.some((d) => d.id === "brats-2021"));

  // 2. Filter by modality CT
  const ctResults = filterRadiologyDatasets(datasets, { modality: "CT" });
  assert.ok(ctResults.length > 200);
  assert.ok(ctResults.every((d) => d.modality.includes("CT")));

  // 3. Filter by region Neuro
  const neuroResults = filterRadiologyDatasets(datasets, { region: "Neuro" });
  assert.ok(neuroResults.length > 100);
  assert.ok(neuroResults.every((d) => d.regions.includes("Neuro")));

  // 4. Filter by task segmentation
  const segResults = filterRadiologyDatasets(datasets, { task: "segmentation" });
  assert.ok(segResults.length > 150);
  assert.ok(segResults.every((d) => d.tasks.includes("segmentation")));

  // 5. Filter with segmentation flag
  const withSeg = filterRadiologyDatasets(datasets, { hasSegmentation: true });
  assert.ok(withSeg.length > 0);
  assert.ok(withSeg.every((d) => d.segmentation === true));
});

test("Radiology Dataset Hub: Calibrated Benchmark Case Mappings", () => {
  assert.equal(BENCHMARK_STUDY_MAP["lidc-idri"], "study-ct-thorax");
  assert.equal(BENCHMARK_STUDY_MAP["lits"], "study-ct-abdomen");
  assert.equal(BENCHMARK_STUDY_MAP["brats-2021"], "study-mr-neuro");
  assert.equal(BENCHMARK_STUDY_MAP["rsna-lumbar-spine-2024"], "study-ct-spine");

  const jsonPath = path.resolve(process.cwd(), "public/data/radiology-datasets.json");
  const datasets = JSON.parse(fs.readFileSync(jsonPath, "utf-8")).map((d) => ({
    ...d,
    benchmarkCaseId: BENCHMARK_STUDY_MAP[d.id] || undefined,
  }));

  const benchmarks = getCalibratedBenchmarkDatasets(datasets);
  assert.ok(benchmarks.length >= 4);
});

test("Radiology Dataset Hub: Deep Fine-Tuning Protocols & Architecture Recipes", () => {
  // Test BraTS 2021 profile
  const bratsProfile = getFineTuningProfile("brats-2021");
  assert.ok(bratsProfile);
  assert.equal(bratsProfile.task, "segmentation");
  assert.match(bratsProfile.recommendedArchitecture, /Swin UNETR|nnU-Net/i);
  assert.match(bratsProfile.recommendedLoss, /Dice/i);
  assert.equal(bratsProfile.intensityNormalization.method, "z-score");
  assert.ok(bratsProfile.evaluationMetrics.some((m) => m.includes("Dice")));

  // Test LIDC-IDRI profile
  const lidcProfile = getFineTuningProfile("lidc-idri");
  assert.ok(lidcProfile);
  assert.equal(lidcProfile.intensityNormalization.method, "hu-clipping");
  assert.deepEqual(lidcProfile.intensityNormalization.huWindow, [-1000, 400]);

  // Test LiTS profile
  const litsProfile = getFineTuningProfile("lits");
  assert.ok(litsProfile);
  assert.deepEqual(litsProfile.intensityNormalization.huWindow, [-100, 250]);

  // Test RSNA Spine profile
  const spineProfile = getFineTuningProfile("rsna-lumbar-spine-2024");
  assert.ok(spineProfile);
  assert.equal(spineProfile.task, "classification");
});

test("Radiology Dataset Hub: Summary Metrics Calculation", () => {
  const sampleDatasets = [
    { id: "1", modality: ["CT"], regions: ["Chest"], segmentation: true, access: "open" },
    { id: "2", modality: ["MRI"], regions: ["Neuro"], segmentation: true, access: "registration" },
    { id: "3", modality: ["CT", "MRI"], regions: ["Abdomen"], segmentation: false, access: "open" },
  ];

  const metrics = getRadiologyHubMetrics(sampleDatasets);
  assert.equal(metrics.total, 3);
  assert.equal(metrics.withSegmentation, 2);
  assert.equal(metrics.openAccess, 2);
  assert.equal(metrics.modalitiesCount["CT"], 2);
  assert.equal(metrics.modalitiesCount["MRI"], 2);
  assert.equal(metrics.regionsCount["Chest"], 1);
  assert.equal(metrics.regionsCount["Neuro"], 1);
  assert.equal(metrics.regionsCount["Abdomen"], 1);
});
