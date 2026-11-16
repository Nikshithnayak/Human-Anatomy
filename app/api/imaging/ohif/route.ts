import { NextResponse } from "next/server";
import { OHIF_DICOMWEB_PRESETS, OHIF_HANGING_PROTOCOLS } from "@/lib/imaging/ohif-bridge";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    repository: "https://github.com/OHIF/Viewers.git",
    localPath: "external/ohif",
    license: "MIT License (Open Health Imaging Foundation)",
    version: "3.14.0-beta.44",
    embeddedPackages: {
      dicomParser: "1.8.21",
      dcmjs: "0.52.0",
    },
    supportedModes: [
      "basic",
      "longitudinal",
      "segmentation",
      "tmtv",
      "preclinical-4d",
      "microscopy",
      "usAnnotation",
    ],
    hangingProtocols: OHIF_HANGING_PROTOCOLS,
    dicomWebPresets: OHIF_DICOMWEB_PRESETS,
    companionApp: {
      script: "npm run ohif:dev",
      defaultUrl: "http://localhost:3001",
      note: "Run standalone OHIF Viewers monorepo companion on port 3001, or use embedded Quad MPR + Measurement Tracking directly inside Radiology Lab.",
    },
  });
}

