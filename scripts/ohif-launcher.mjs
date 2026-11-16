import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const ohifDir = path.join(rootDir, "external", "ohif");

function main() {
  if (!fs.existsSync(ohifDir)) {
    console.error("external/ohif is not initialized. Run: git submodule update --init external/ohif");
    process.exit(1);
  }

  const nodeModulesDir = path.join(ohifDir, "node_modules");
  if (!fs.existsSync(nodeModulesDir)) {
    console.error(
      [
        "OHIF monorepo dependencies are not installed in external/ohif yet.",
        "Anatomy Atelier already runs OHIF's core dicom-parser + dcmjs + Quad-MPR & measurement suite natively at /en (Radiology Lab).",
        "To also run the standalone full OHIF Viewers monorepo companion app on port 3001 (requires >=16 GB RAM recommended):",
        "  1. pnpm --dir external/ohif install",
        "  2. npm run ohif:dev",
      ].join("\n")
    );
    process.exit(1);
  }

  const port = process.env.OHIF_PORT || "3001";
  const child = spawn("pnpm", ["--filter", "@ohif/app", "run", "dev:fast"], {
    cwd: ohifDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      PORT: port,
      PUBLIC_URL: "/",
    },
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();

