import { NextResponse } from "next/server";
import { Z_ANATOMY_SYSTEMS, Z_ANATOMY_PRESETS } from "@/lib/anatomy/z-anatomy";

export async function GET() {
  const totalStructures = Z_ANATOMY_SYSTEMS.reduce((sum, sys) => sum + sys.structureCount, 0);

  return NextResponse.json({
    repository: "https://github.com/nqwrc/3d-anatomy.git",
    localPath: "external/3d-anatomy",
    assetsBasePath: "/z-anatomy",
    license: "CC BY-NC-SA 4.0",
    dataset: "Z-Anatomy (BodyParts3D & Z-Anatomy Blender Export)",
    totalStructures,
    systems: Z_ANATOMY_SYSTEMS,
    presets: Z_ANATOMY_PRESETS,
    attributions: [
      "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan",
      "Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0",
      "Cranial Nerves and Foramina - University of Dundee, CAHID - CC-BY 4.0",
      "Anatomy of the Inner Ear - University of Dundee School of Medicine - CC-BY-NC-SA 4.0",
      "Kidney - lissiecowley - CC-BY-NC 4.0",
      "Wikipedia Contributors - CC BY-SA 3.0 & GFDL",
    ],
  });
}

