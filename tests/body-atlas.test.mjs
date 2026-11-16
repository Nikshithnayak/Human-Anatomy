import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BODY_ATLAS_SYSTEMS,
  BODY_ATLAS_LAYERS,
  filterBodyAtlasParts,
  mapBodyAtlasPartToOrganId,
} from "../lib/anatomy/body-atlas.ts";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public", "body-atlas");
const EXTERNAL_DIR = path.join(ROOT, "external", "body-atlas");

test("BodyAtlas Integration: Core assets and 14 system modules exist on disk", () => {
  assert.ok(fs.existsSync(PUBLIC_DIR), "public/body-atlas exists");
  assert.ok(fs.existsSync(EXTERNAL_DIR), "external/body-atlas exists");

  const coreFiles = [
    "core/landmarks.js",
    "core/helpers.js",
    "core/registry.js",
    "core/controls.js",
    "core/viewer.js",
    "core/ui.css",
    "index.html",
  ];

  for (const f of coreFiles) {
    assert.ok(fs.existsSync(path.join(PUBLIC_DIR, f)), `public/body-atlas/${f} exists`);
    assert.ok(fs.existsSync(path.join(EXTERNAL_DIR, f)), `external/body-atlas/${f} exists`);
  }

  const moduleIds = [
    "integumentary",
    "skeletal",
    "muscular_upper",
    "muscular_lower",
    "cardiovascular",
    "respiratory",
    "digestive",
    "urinary_reproductive",
    "nervous_central",
    "nervous_peripheral",
    "glands",
    "lymphatic",
    "eye",
    "ear",
  ];

  for (const mod of moduleIds) {
    assert.ok(
      fs.existsSync(path.join(PUBLIC_DIR, "systems", `${mod}.js`)),
      `public/body-atlas/systems/${mod}.js exists`
    );
    assert.ok(
      fs.existsSync(path.join(EXTERNAL_DIR, "systems", `${mod}.js`)),
      `external/body-atlas/systems/${mod}.js exists`
    );
  }
});

test("BodyAtlas Catalog: parts.json and systems.json metadata integrity", () => {
  const partsPath = path.join(PUBLIC_DIR, "data", "parts.json");
  const systemsPath = path.join(PUBLIC_DIR, "data", "systems.json");

  assert.ok(fs.existsSync(partsPath), "parts.json exists");
  assert.ok(fs.existsSync(systemsPath), "systems.json exists");

  const parts = JSON.parse(fs.readFileSync(partsPath, "utf-8"));
  const meta = JSON.parse(fs.readFileSync(systemsPath, "utf-8"));

  assert.equal(parts.length, 1310, "Total extracted parts should be 1,310");
  assert.equal(meta.totalParts, 1310, "Metadata reports 1,310 parts");
  assert.equal(BODY_ATLAS_SYSTEMS.length, 12, "12 anatomical systems configured");
  assert.equal(BODY_ATLAS_LAYERS.length, 10, "10 progressive dissection peel layers configured");

  // Validate part schema
  const sample = parts[0];
  assert.ok(sample.id, "Part has id");
  assert.ok(sample.name, "Part has name");
  assert.ok(sample.system, "Part has system");
  assert.ok(typeof sample.layer === "number", "Part has numeric layer");
  assert.ok(Array.isArray(sample.center) && sample.center.length === 3, "Part has [x, y, z] center");
  assert.ok(Array.isArray(sample.sexes) && sample.sexes.length > 0, "Part has sexes");
  assert.ok(sample.info, "Part has clinical info");
});

test("BodyAtlas Search & Facet Filter Engine", () => {
  const partsPath = path.join(PUBLIC_DIR, "data", "parts.json");
  const parts = JSON.parse(fs.readFileSync(partsPath, "utf-8"));

  // 1. Filter by system
  const cardio = filterBodyAtlasParts(parts, { system: "cardiovascular" });
  assert.ok(cardio.length > 100, "Cardiovascular system has >100 structures");
  assert.ok(cardio.every((p) => p.system === "cardiovascular"));

  // 2. Filter by max dissection layer
  const skinAndFatOnly = filterBodyAtlasParts(parts, { maxLayer: 2 });
  assert.ok(skinAndFatOnly.every((p) => p.layer <= 2), "Every structure is within layers 1-2");

  // 3. Filter by sex
  const femaleOnly = filterBodyAtlasParts(parts, { sex: "female" });
  assert.ok(femaleOnly.every((p) => p.sexes.includes("female")));

  // 4. Keyword query for aorta
  const aortaParts = filterBodyAtlasParts(parts, { query: "aorta" });
  assert.ok(aortaParts.length >= 3, "Finds aorta structures");
  assert.ok(
    aortaParts.some((p) => p.id === "aorta-abdominal" || p.name.toLowerCase().includes("aorta"))
  );

  // 5. Latin search for Aorta abdominalis
  const abdominalAorta = filterBodyAtlasParts(parts, { query: "aorta abdominalis" });
  assert.ok(abdominalAorta.length >= 1, "Finds aorta abdominalis via Latin term");
});

test("BodyAtlas to Organ Atelier Deep-Link Mapper", () => {
  const heartPart = {
    id: "heart-ventricle-l",
    name: "Left ventricle",
    latin: "Ventriculus sinister cordis",
    system: "cardiovascular",
    systemName: "Cardiovascular",
    systemColor: "#d3363b",
    layer: 8,
    layerName: "Organs",
    region: "thorax",
    side: "L",
    parent: null,
    info: { description: "", function: "", size: "", notes: "" },
    center: [0, 0, 0],
    sexes: ["male", "female"],
  };

  const brainPart = {
    id: "cerebrum-frontal-lobe-l",
    name: "Left frontal lobe",
    latin: "Lobus frontalis",
    system: "nervous",
    systemName: "Nervous",
    systemColor: "#e8d24a",
    layer: 8,
    layerName: "Organs",
    region: "head",
    side: "L",
    parent: null,
    info: { description: "", function: "", size: "", notes: "" },
    center: [0, 0, 0],
    sexes: ["male", "female"],
  };

  const kidneyPart = {
    id: "kidney-l",
    name: "Left kidney",
    latin: "Ren sinister",
    system: "urinary",
    systemName: "Urinary",
    systemColor: "#8b3b3b",
    layer: 8,
    layerName: "Organs",
    region: "abdomen",
    side: "L",
    parent: null,
    info: { description: "", function: "", size: "", notes: "" },
    center: [0, 0, 0],
    sexes: ["male", "female"],
  };

  assert.equal(mapBodyAtlasPartToOrganId(heartPart), "heart");
  assert.equal(mapBodyAtlasPartToOrganId(brainPart), "brain");
  assert.equal(mapBodyAtlasPartToOrganId(kidneyPart), "kidneys");
});
