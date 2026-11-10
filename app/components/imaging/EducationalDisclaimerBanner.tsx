"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";

interface EducationalDisclaimerBannerProps {
  stage?: "raw" | "segmented" | "reconstructed" | "explorer";
}

export function EducationalDisclaimerBanner({ stage = "raw" }: EducationalDisclaimerBannerProps) {
  const stageLabels = {
    raw: {
      badge: "Stage 1: Uploaded Imaging Volume",
      text: "Raw voxel density and spatial geometry. Client-side PHI de-identified.",
    },
    segmented: {
      badge: "Stage 2: Segmented Attenuation Masks",
      text: "Hounsfield Unit attenuation masks. Unvalidated research algorithm.",
    },
    reconstructed: {
      badge: "Stage 3: 3D Surface Reconstruction",
      text: "Volumetric surface geometry generated from voxel masks.",
    },
    explorer: {
      badge: "Stage 4: Educational 3D Visualization",
      text: "Synchronized slice-to-mesh anatomical exploration environment.",
    },
  };

  const current = stageLabels[stage];

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 text-neutral-800 dark:text-neutral-200 text-xs flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
          <ShieldCheck size={16} />
        </div>
        <div>
          <span className="font-bold text-amber-900 dark:text-amber-300 mr-2">
            Educational & Research Visualization Only:
          </span>
          <span className="text-neutral-600 dark:text-neutral-400 text-[11px]">
            Not clinically certified for diagnosis, pathology detection, treatment planning, or surgical navigation.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-semibold">
        <span className="px-2.5 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
          {current.badge}
        </span>
      </div>
    </div>
  );
}
