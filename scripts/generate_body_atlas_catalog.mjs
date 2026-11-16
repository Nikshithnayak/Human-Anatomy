import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const BODY_ATLAS_DIR = path.join(ROOT, "external", "body-atlas");
const OUT_DIR = path.join(ROOT, "public", "body-atlas", "data");

// Dynamic import of Three.js and legacy script loading
import * as THREE from "three";
globalThis.THREE = THREE;

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Load landmarks, helpers, registry
require(path.join(BODY_ATLAS_DIR, "core", "landmarks.js"));
require(path.join(BODY_ATLAS_DIR, "core", "helpers.js"));
require(path.join(BODY_ATLAS_DIR, "core", "registry.js"));

const { ANATOMY, H } = globalThis;

for (const id of ANATOMY.MODULE_IDS) {
  require(path.join(BODY_ATLAS_DIR, "systems", `${id}.js`));
}

console.log(`Loaded ${ANATOMY.MODULE_IDS.length} BodyAtlas system modules.`);

const byId = new Map();
const systemCounts = {};
const layerCounts = {};

for (const sex of ["male", "female"]) {
  for (const id of ANATOMY.MODULE_IDS) {
    const group = ANATOMY.build(id, { sex, quality: 1 });
    const parts = H.parts(group);
    for (const mesh of parts) {
      const p = mesh.userData.part;
      if (!p || !p.id) continue;

      if (!byId.has(p.id)) {
        mesh.updateWorldMatrix(true, false);
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());

        const layerName = H.LAYER_NAMES[p.layer] || `Layer ${p.layer}`;
        const systemMeta = H.SYSTEMS[p.system] || { name: p.system, color: "#888888" };

        const entry = {
          id: p.id,
          name: p.name || p.id,
          latin: p.latin || "",
          system: p.system,
          systemName: systemMeta.name,
          systemColor: systemMeta.color,
          layer: p.layer,
          layerName,
          region: p.region || "body",
          side: p.side || "M",
          parent: p.parent || null,
          info: {
            description: p.info?.description || "",
            function: p.info?.function || "",
            size: p.info?.size || "",
            notes: p.info?.notes || "",
          },
          center: [
            parseFloat(center.x.toFixed(4)),
            parseFloat(center.y.toFixed(4)),
            parseFloat(center.z.toFixed(4)),
          ],
          sexes: [],
        };
        byId.set(p.id, entry);
      }
      if (!byId.get(p.id).sexes.includes(sex)) {
        byId.get(p.id).sexes.push(sex);
      }
    }
  }
}

const allParts = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "en"));

for (const p of allParts) {
  systemCounts[p.system] = (systemCounts[p.system] || 0) + 1;
  layerCounts[p.layer] = (layerCounts[p.layer] || 0) + 1;
}

const systemsList = Object.entries(H.SYSTEMS).map(([id, meta]) => ({
  id,
  name: meta.name,
  color: meta.color,
  partCount: systemCounts[id] || 0,
}));

const layersList = Object.entries(H.LAYER_NAMES).map(([id, name]) => ({
  layer: parseInt(id, 10),
  name,
  partCount: layerCounts[id] || 0,
}));

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

fs.writeFileSync(path.join(OUT_DIR, "parts.json"), JSON.stringify(allParts, null, 2), "utf-8");
fs.writeFileSync(
  path.join(OUT_DIR, "systems.json"),
  JSON.stringify({ systems: systemsList, layers: layersList, totalParts: allParts.length }, null, 2),
  "utf-8"
);

console.log(`Generated catalog with ${allParts.length} unique parts across ${systemsList.length} systems and ${layersList.length} depth layers.`);
console.log("Saved to public/body-atlas/data/parts.json and public/body-atlas/data/systems.json");
