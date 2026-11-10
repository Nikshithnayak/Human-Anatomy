"use client";

import { useState } from "react";
import type { MedicalVolume, VolumePlane } from "@/lib/imaging/volume-model";
import type { SegmentationResult } from "@/lib/imaging/segmentation-engine";
import { MprSliceViewer } from "./MprSliceViewer";
import { sounds } from "@/app/lib/sound";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Sliders,
} from "lucide-react";

interface SegmentationReviewOverlayProps {
  volume: MedicalVolume;
  segmentation: SegmentationResult;
  onAcceptAndGenerate3D: () => void;
  onAdjustParameters: () => void;
  onReject: () => void;
}

export function SegmentationReviewOverlay({
  volume,
  segmentation,
  onAcceptAndGenerate3D,
  onAdjustParameters,
  onReject,
}: SegmentationReviewOverlayProps) {
  const [activePlane, setActivePlane] = useState<VolumePlane>("axial");
  const [sliceIndices, setSliceIndices] = useState({
    axial: Math.floor(volume.depth / 2),
    coronal: Math.floor(volume.height / 2),
    sagittal: Math.floor(volume.width / 2),
  });

  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const [visibleStructures, setVisibleStructures] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    segmentation.structures.forEach((s) => {
      init[s.id] = true;
    });
    return init;
  });

  const handleSliceChange = (plane: VolumePlane, nextIndex: number) => {
    setSliceIndices((prev) => ({
      ...prev,
      [plane]: nextIndex,
    }));
  };

  const toggleStructure = (id: string) => {
    sounds.playClick();
    setVisibleStructures((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Build colorMap for MprSliceViewer
  const colorMap: Record<number, [number, number, number, number]> = {};
  segmentation.structures.forEach((s) => {
    if (visibleStructures[s.id]) {
      const [r, g, b] = s.defaultColor;
      colorMap[s.labelIndex] = [r, g, b, 0.75];
    }
  });

  return (
    <div className="space-y-4">
      {/* Top Review Stage Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/80 border border-[#755b46]/20 dark:border-neutral-800 shadow-sm backdrop-blur-md">
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Mandatory Clinical Safety Check
          </span>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
            Segmentation Mask Review & Verification
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Inspect the colored segmentation contours against the underlying CT/MRI slices to verify anatomical boundaries before 3D surface reconstruction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Reject / Back</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playCelebration();
              onAcceptAndGenerate3D();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2c2623] hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-bold shadow-md transition-all"
          >
            <CheckCircle2 size={15} className="text-emerald-400 dark:text-emerald-600" />
            <span>Accept & Generate 3D Mesh</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Review Workspace: Viewer + Structure Control Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 Cols: Multiplanar Viewer with Mask Overlay */}
        <div className="lg:col-span-3 min-h-[500px] flex flex-col">
          <MprSliceViewer
            volume={volume}
            activePlane={activePlane}
            onPlaneChange={setActivePlane}
            currentSliceIndices={sliceIndices}
            onSliceChange={handleSliceChange}
            maskOverlay={{
              mask: segmentation.mask,
              colorMap,
              opacity: overlayOpacity,
            }}
          />
        </div>

        {/* Right 1 Col: Mask Inspection & Volumetrics Panel */}
        <div className="p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 border border-[#755b46]/20 dark:border-neutral-800 shadow-sm backdrop-blur-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Segmented Contours
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {segmentation.structures.length} structures
              </span>
            </div>

            {/* Mask Opacity Slider */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <span>Overlay Opacity</span>
                <span className="font-mono">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(overlayOpacity * 100)}
                onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10) / 100)}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded"
              />
            </div>

            {/* Structure List with Color Swatches & Volumetrics */}
            <div className="space-y-2">
              {segmentation.structures.map((s) => {
                const isVisible = visibleStructures[s.id] ?? true;
                const volumeCc = segmentation.volumeCcPerStructure[s.id] || 0;

                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-800/40 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/80 transition-colors flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm"
                        style={{ backgroundColor: s.colorHex }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-neutral-800 dark:text-neutral-100 truncate">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {volumeCc > 0 ? `${volumeCc.toLocaleString()} cc` : "Boundary mask"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStructure(s.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isVisible
                          ? "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          : "text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      }`}
                      title={isVisible ? "Hide mask" : "Show mask"}
                    >
                      {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onAdjustParameters}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors"
            >
              <Sliders size={14} />
              <span>Adjust HU Thresholds</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
