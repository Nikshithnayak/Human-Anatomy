import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const zAnatomyDir = path.join(rootDir, "external", "3d-anatomy");
const zPublicSrc = path.join(zAnatomyDir, "public");
const zPublicDest = path.join(rootDir, "public", "z-anatomy");
const ohifDir = path.join(rootDir, "external", "ohif");
const ortDistDir = path.join(rootDir, "node_modules", "onnxruntime-web", "dist");
const ortPublicDest = path.join(rootDir, "public", "ort");

function main() {
  const report = {
    zAnatomy: { synced: false, models: [], dataFiles: [], dracoFiles: [] },
    ohif: { present: false, version: null },
    ortWasm: { synced: false, files: [] },
  };

  if (fs.existsSync(ortDistDir)) {
    fs.mkdirSync(ortPublicDest, { recursive: true });
    for (const file of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) {
      const src = path.join(ortDistDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(ortPublicDest, file));
        report.ortWasm.files.push(file);
      }
    }
    report.ortWasm.synced = report.ortWasm.files.includes("ort-wasm-simd-threaded.wasm");
  }

  if (fs.existsSync(zPublicSrc)) {
    fs.mkdirSync(zPublicDest, { recursive: true });
    fs.cpSync(zPublicSrc, zPublicDest, { recursive: true });

    const noticeSrc = path.join(zAnatomyDir, "NOTICE");
    const licenseSrc = path.join(zAnatomyDir, "LICENSE");
    if (fs.existsSync(noticeSrc)) {
      fs.copyFileSync(noticeSrc, path.join(zPublicDest, "NOTICE.txt"));
    }
    if (fs.existsSync(licenseSrc)) {
      fs.copyFileSync(licenseSrc, path.join(zPublicDest, "LICENSE.txt"));
    }

    report.zAnatomy.synced = true;
    const modelsDir = path.join(zPublicDest, "models");
    const dataDir = path.join(zPublicDest, "data");
    const dracoDir = path.join(zPublicDest, "draco");

    if (fs.existsSync(modelsDir)) {
      report.zAnatomy.models = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".glb"));
    }
    if (fs.existsSync(dataDir)) {
      report.zAnatomy.dataFiles = fs.readdirSync(dataDir);
    }
    if (fs.existsSync(dracoDir)) {
      report.zAnatomy.dracoFiles = fs.readdirSync(dracoDir);
    }
  }

  if (fs.existsSync(ohifDir)) {
    report.ohif.present = true;
    const verPath = path.join(ohifDir, "version.txt");
    if (fs.existsSync(verPath)) {
      report.ohif.version = fs.readFileSync(verPath, "utf-8").trim();
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main();

