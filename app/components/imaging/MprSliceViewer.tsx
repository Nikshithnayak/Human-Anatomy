"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { MedicalVolume, VolumePlane } from "@/lib/imaging/volume-model";
import { CLINICAL_WINDOW_PRESETS } from "@/lib/imaging/volume-model";
import {
  OHIF_HANGING_PROTOCOLS,
  exportOhifDicomSrReport,
  measureAngleDegrees,
  measureEllipticalRoi,
  measureLineMm,
  sampleVolumeProbe,
  type HuProbeReading,
  type NormalizedPoint,
  type OhifLayoutMode,
  type OhifMeasurement,
  type OhifToolId,
} from "@/lib/imaging/ohif-bridge";
import { sounds } from "@/app/lib/sound";
import {
  Activity,
  CircleDot,
  Contrast,
  Crosshair,
  Download,
  Hand,
  Info,
  LayoutGrid,
  Maximize2,
  MoveHorizontal,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Scan,
  Trash2,
  Triangle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface MprSliceViewerProps {
  volume: MedicalVolume;
  activePlane?: VolumePlane;
  onPlaneChange?: (plane: VolumePlane) => void;
  currentSliceIndices: {
    axial: number;
    coronal: number;
    sagittal: number;
  };
  onSliceChange: (plane: VolumePlane, sliceIndex: number) => void;
  maskOverlay?: {
    mask: Uint8Array;
    colorMap: Record<number, [number, number, number, number]>;
    opacity: number;
  };
  showCrosshairs?: boolean;
}

const TOOL_BUTTONS: {
  id: OhifToolId;
  label: string;
  hint: string;
  icon: typeof Crosshair;
}[] = [
  { id: "crosshairs", label: "Crosshairs", hint: "Sync orthogonal MPR planes", icon: Crosshair },
  { id: "windowLevel", label: "W/L Drag", hint: "Drag horizontally/vertically to adjust contrast", icon: Contrast },
  { id: "probe", label: "HU Probe", hint: "Inspect Hounsfield Units & tissue class on hover", icon: Activity },
  { id: "length", label: "Length", hint: "Click start & end points to measure distance (mm)", icon: Ruler },
  { id: "angle", label: "Angle", hint: "Click 3 points (ray-vertex-ray) to measure angle (°)", icon: Triangle },
  { id: "ellipticalRoi", label: "ROI Stats", hint: "Click two corners for calibrated HU ellipse statistics", icon: CircleDot },
  { id: "pan", label: "Pan", hint: "Click & drag to pan zoomed viewport", icon: Hand },
];

export function MprSliceViewer({
  volume,
  activePlane = "axial",
  onPlaneChange,
  currentSliceIndices,
  onSliceChange,
  maskOverlay,
  showCrosshairs = true,
}: MprSliceViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const quadAxialRef = useRef<HTMLCanvasElement>(null);
  const quadCoronalRef = useRef<HTMLCanvasElement>(null);
  const quadSagittalRef = useRef<HTMLCanvasElement>(null);

  const [selectedPreset, setSelectedPreset] = useState<string>("softTissue");
  const [windowWidth, setWindowWidth] = useState(volume.metadata.windowWidth || 400);
  const [windowCenter, setWindowCenter] = useState(volume.metadata.windowCenter || 40);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [invertGray, setInvertGray] = useState(false);

  // OHIF workstation modes & tools
  const [layoutMode, setLayoutMode] = useState<OhifLayoutMode>("single");
  const [activeTool, setActiveTool] = useState<OhifToolId>("crosshairs");
  const [isCinePlaying, setIsCinePlaying] = useState(false);
  const [measurements, setMeasurements] = useState<OhifMeasurement[]>([]);
  const [draftPoints, setDraftPoints] = useState<NormalizedPoint[]>([]);
  const [hoverPoint, setHoverPoint] = useState<NormalizedPoint | null>(null);
  const [probeReading, setProbeReading] = useState<HuProbeReading | null>(null);
  const [showMeasurementsPanel, setShowMeasurementsPanel] = useState(false);

  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [isDraggingWL, setIsDraggingWL] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, w: 400, l: 40 });
  const [showMetadata, setShowMetadata] = useState(false);

  const activeSliceIndex = currentSliceIndices[activePlane];
  const maxSlices =
    activePlane === "axial"
      ? volume.depth
      : activePlane === "coronal"
      ? volume.height
      : volume.width;

  // Reset annotations when switching volumes
  useEffect(() => {
    setMeasurements([]);
    setDraftPoints([]);
    setIsCinePlaying(false);
    setProbeReading(null);
  }, [volume.id]);

  // Render active single slice canvas
  useEffect(() => {
    if (layoutMode !== "single") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    volume.renderSliceToCanvas(
      activePlane,
      activeSliceIndex,
      canvas,
      windowWidth,
      windowCenter,
      maskOverlay,
      invertGray
    );
  }, [volume, layoutMode, activePlane, activeSliceIndex, windowWidth, windowCenter, maskOverlay, invertGray]);

  // Render OHIF 2x2 Quad MPR canvases simultaneously
  useEffect(() => {
    if (layoutMode !== "quad") return;
    if (quadAxialRef.current) {
      volume.renderSliceToCanvas(
        "axial",
        currentSliceIndices.axial,
        quadAxialRef.current,
        windowWidth,
        windowCenter,
        maskOverlay,
        invertGray
      );
    }
    if (quadCoronalRef.current) {
      volume.renderSliceToCanvas(
        "coronal",
        currentSliceIndices.coronal,
        quadCoronalRef.current,
        windowWidth,
        windowCenter,
        maskOverlay,
        invertGray
      );
    }
    if (quadSagittalRef.current) {
      volume.renderSliceToCanvas(
        "sagittal",
        currentSliceIndices.sagittal,
        quadSagittalRef.current,
        windowWidth,
        windowCenter,
        maskOverlay,
        invertGray
      );
    }
  }, [volume, layoutMode, currentSliceIndices, windowWidth, windowCenter, maskOverlay, invertGray]);

  // Cine loop playback (8 fps)
  useEffect(() => {
    if (!isCinePlaying) return;
    const timer = window.setInterval(() => {
      const next = (activeSliceIndex + 1) % maxSlices;
      onSliceChange(activePlane, next);
    }, 125);
    return () => window.clearInterval(timer);
  }, [isCinePlaying, activePlane, activeSliceIndex, maxSlices, onSliceChange]);

  const handlePresetSelect = (presetKey: string) => {
    sounds.playClick();
    const preset = CLINICAL_WINDOW_PRESETS[presetKey];
    if (preset) {
      setSelectedPreset(presetKey);
      setWindowWidth(preset.windowWidth);
      setWindowCenter(preset.windowCenter);
    }
  };

  const applyHangingProtocol = (protocolId: string) => {
    const protocol = OHIF_HANGING_PROTOCOLS.find((p) => p.id === protocolId);
    if (!protocol) return;
    sounds.playClick();
    setLayoutMode(protocol.layout);
    setWindowWidth(protocol.windowWidth);
    setWindowCenter(protocol.windowCenter);
    setSelectedPreset("");
  };

  const getNormalizedPoint = (e: React.MouseEvent<HTMLCanvasElement>): NormalizedPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const applyCrosshairAtPoint = useCallback(
    (pt: NormalizedPoint, targetPlane: VolumePlane) => {
      if (targetPlane === "axial") {
        onSliceChange("sagittal", Math.round(pt.x * (volume.width - 1)));
        onSliceChange("coronal", Math.round(pt.y * (volume.height - 1)));
      } else if (targetPlane === "coronal") {
        onSliceChange("sagittal", Math.round(pt.x * (volume.width - 1)));
        onSliceChange("axial", Math.round((1 - pt.y) * (volume.depth - 1)));
      } else {
        onSliceChange("coronal", Math.round(pt.x * (volume.height - 1)));
        onSliceChange("axial", Math.round((1 - pt.y) * (volume.depth - 1)));
      }
    },
    [onSliceChange, volume.depth, volume.height, volume.width]
  );

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    if (activeTool === "pan" || e.shiftKey) {
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y, w: windowWidth, l: windowCenter };
      return;
    }

    if (activeTool === "windowLevel") {
      setIsDraggingWL(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, w: windowWidth, l: windowCenter };
      return;
    }

    const pt = getNormalizedPoint(e);
    if (!pt) return;

    if (activeTool === "crosshairs" || activeTool === "probe") {
      if (showCrosshairs && activeTool === "crosshairs") {
        applyCrosshairAtPoint(pt, activePlane);
      }
      setProbeReading(sampleVolumeProbe(volume, activePlane, activeSliceIndex, pt.x, pt.y));
      return;
    }

    if (activeTool === "length") {
      if (draftPoints.length === 0) {
        setDraftPoints([pt]);
      } else {
        const p1 = draftPoints[0];
        const mm = measureLineMm(volume, activePlane, p1, pt);
        const item: OhifMeasurement = {
          id: `meas-${Date.now()}`,
          tool: "length",
          plane: activePlane,
          sliceIndex: activeSliceIndex,
          points: [p1, pt],
          summaryText: `${mm.toFixed(1)} mm`,
          metrics: { lengthMm: Number(mm.toFixed(2)) },
          createdAt: new Date().toISOString(),
        };
        setMeasurements((prev) => [item, ...prev]);
        setShowMeasurementsPanel(true);
        setDraftPoints([]);
        sounds.playClick();
      }
      return;
    }

    if (activeTool === "angle") {
      if (draftPoints.length < 2) {
        setDraftPoints((prev) => [...prev, pt]);
      } else {
        const [p1, vertex] = draftPoints;
        const deg = measureAngleDegrees(volume, activePlane, p1, vertex, pt);
        const item: OhifMeasurement = {
          id: `meas-${Date.now()}`,
          tool: "angle",
          plane: activePlane,
          sliceIndex: activeSliceIndex,
          points: [p1, vertex, pt],
          summaryText: `${deg.toFixed(1)}°`,
          metrics: { angleDeg: Number(deg.toFixed(1)) },
          createdAt: new Date().toISOString(),
        };
        setMeasurements((prev) => [item, ...prev]);
        setShowMeasurementsPanel(true);
        setDraftPoints([]);
        sounds.playClick();
      }
      return;
    }

    if (activeTool === "ellipticalRoi") {
      if (draftPoints.length === 0) {
        setDraftPoints([pt]);
      } else {
        const c1 = draftPoints[0];
        const stats = measureEllipticalRoi(volume, activePlane, activeSliceIndex, c1, pt);
        const item: OhifMeasurement = {
          id: `meas-${Date.now()}`,
          tool: "ellipticalRoi",
          plane: activePlane,
          sliceIndex: activeSliceIndex,
          points: [c1, pt],
          summaryText: `Area ${stats.areaMm2.toFixed(0)} mm² • Mean ${stats.meanHu.toFixed(0)} HU`,
          metrics: {
            areaMm2: Number(stats.areaMm2.toFixed(1)),
            meanHu: Number(stats.meanHu.toFixed(1)),
            stdDevHu: Number(stats.stdDevHu.toFixed(1)),
            minHu: stats.minHu,
            maxHu: stats.maxHu,
            voxelCount: stats.voxelCount,
          },
          createdAt: new Date().toISOString(),
        };
        setMeasurements((prev) => [item, ...prev]);
        setShowMeasurementsPanel(true);
        setDraftPoints([]);
        sounds.playClick();
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (isDraggingPan) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
      return;
    }
    if (isDraggingWL) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setSelectedPreset("");
      setWindowWidth(Math.max(10, Math.min(2500, Math.round(dragStartRef.current.w + dx * 3))));
      setWindowCenter(Math.max(-900, Math.min(900, Math.round(dragStartRef.current.l - dy * 2))));
      return;
    }
    if (e.target === canvasRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const pt = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
      setHoverPoint(pt);
      setProbeReading(sampleVolumeProbe(volume, activePlane, activeSliceIndex, pt.x, pt.y));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingPan(false);
    setIsDraggingWL(false);
  };

  const handleExportDicomSr = () => {
    const report = exportOhifDicomSrReport(volume, measurements);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ohif-dicom-sr-${volume.metadata.deidentifiedCaseId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sounds.playCelebration();
  };

  const resetView = () => {
    sounds.playClick();
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setDraftPoints([]);
    setInvertGray(false);
  };

  // Crosshair coordinate percentages
  const crosshairX =
    activePlane === "axial"
      ? (currentSliceIndices.sagittal / (volume.width - 1)) * 100
      : activePlane === "coronal"
      ? (currentSliceIndices.sagittal / (volume.width - 1)) * 100
      : (currentSliceIndices.coronal / (volume.height - 1)) * 100;

  const crosshairY =
    activePlane === "axial"
      ? (currentSliceIndices.coronal / (volume.height - 1)) * 100
      : activePlane === "coronal"
      ? (1 - currentSliceIndices.axial / (volume.depth - 1)) * 100
      : (1 - currentSliceIndices.axial / (volume.depth - 1)) * 100;

  const [physX, physY, physZ] = volume.voxelToMillimeters(
    currentSliceIndices.sagittal,
    currentSliceIndices.coronal,
    currentSliceIndices.axial
  );

  const sliceMeasurements = measurements.filter(
    (m) => m.plane === activePlane && m.sliceIndex === activeSliceIndex
  );

  return (
    <div className="flex flex-col h-full rounded-3xl bg-neutral-900 border border-neutral-800 text-white overflow-hidden shadow-xl">
      {/* Top OHIF Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 bg-neutral-950/90 border-b border-neutral-800 backdrop-blur-md">
        {/* Orthogonal Plane Selector + Layout Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
            {(["axial", "coronal", "sagittal"] as VolumePlane[]).map((plane) => {
              const active = activePlane === plane;
              return (
                <button
                  key={plane}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onPlaneChange?.(plane);
                    setDraftPoints([]);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    active
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  {plane}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setLayoutMode((m) => (m === "single" ? "quad" : "single"));
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
              layoutMode === "quad"
                ? "bg-cyan-600 border-cyan-500 text-white shadow-sm"
                : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
            }`}
            title="Switch between OHIF Single MPR and OHIF 2×2 Quad Hanging Protocol"
          >
            <LayoutGrid size={13} />
            <span>{layoutMode === "quad" ? "2×2 Quad MPR" : "1×1 MPR"}</span>
          </button>
        </div>

        {/* Physical Coordinates Pill */}
        <div className="text-[11px] font-mono text-neutral-400 px-3 py-1 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
          <span>X: <strong className="text-amber-400">{physX.toFixed(1)}</strong> mm</span>
          <span>Y: <strong className="text-amber-400">{physY.toFixed(1)}</strong> mm</span>
          <span>Z: <strong className="text-amber-400">{physZ.toFixed(1)}</strong> mm</span>
        </div>

        {/* View & OHIF Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setIsCinePlaying((p) => !p);
            }}
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold ${
              isCinePlaying ? "bg-emerald-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            }`}
            title={isCinePlaying ? "Pause Cine Slice Playback" : "Play Cine Slice Loop"}
          >
            {isCinePlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setInvertGray((v) => !v);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              invertGray ? "bg-amber-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            }`}
            title="Invert Grayscale LUT"
          >
            <Scan size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.25))}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Reset Pan, Zoom & LUT"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            onClick={() => setShowMetadata((v) => !v)}
            className={`p-1.5 rounded-lg transition-colors ${
              showMetadata ? "bg-amber-600 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            }`}
            title="DICOM Metadata"
          >
            <Info size={15} />
          </button>
        </div>
      </div>

      {/* OHIF Workstation Tool Palette & Hanging Protocol Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-1.5 bg-neutral-900/95 border-b border-neutral-800 text-[11px]">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mr-1">
            OHIF Tools:
          </span>
          {TOOL_BUTTONS.map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.id && layoutMode === "single";
            return (
              <button
                key={tool.id}
                type="button"
                title={tool.hint}
                onClick={() => {
                  sounds.playClick();
                  setLayoutMode("single");
                  setActiveTool(tool.id);
                  setDraftPoints([]);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors ${
                  active
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                }`}
              >
                <Icon size={12} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {draftPoints.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">
              {activeTool === "angle"
                ? `Click ${3 - draftPoints.length} more point(s)...`
                : "Click 2nd point to complete..."}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowMeasurementsPanel((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors ${
              showMeasurementsPanel || measurements.length > 0
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            <MoveHorizontal size={12} />
            <span>Measurements ({measurements.length})</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Area: Single Slice OR OHIF 2x2 Quad MPR */}
      {layoutMode === "quad" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2.5 bg-black flex-1 min-h-[420px]">
          {(
            [
              { plane: "axial" as const, ref: quadAxialRef, label: "AXIAL", max: volume.depth },
              { plane: "coronal" as const, ref: quadCoronalRef, label: "CORONAL", max: volume.height },
              { plane: "sagittal" as const, ref: quadSagittalRef, label: "SAGITTAL", max: volume.width },
            ] as const
          ).map((pane) => (
            <div
              key={pane.plane}
              onClick={() => {
                onPlaneChange?.(pane.plane);
              }}
              className={`relative rounded-xl bg-neutral-950 border overflow-hidden flex items-center justify-center min-h-[195px] cursor-pointer transition-all ${
                activePlane === pane.plane ? "border-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.4)]" : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <canvas
                ref={pane.ref}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (!rect.width || !rect.height) return;
                  applyCrosshairAtPoint(
                    {
                      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
                      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
                    },
                    pane.plane
                  );
                }}
                className="w-auto h-auto max-h-[210px] object-contain block"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {pane.label} · {currentSliceIndices[pane.plane] + 1}/{pane.max}
              </div>
              <button
                type="button"
                title="Expand to 1×1 viewport"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaneChange?.(pane.plane);
                  setLayoutMode("single");
                }}
                className="absolute top-2 right-2 p-1 rounded-md bg-black/70 hover:bg-amber-600 text-neutral-300 hover:text-white transition-colors"
              >
                <Maximize2 size={12} />
              </button>
            </div>
          ))}

          {/* 4th Quadrant: OHIF Hanging Protocol & Study Summary */}
          <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 flex flex-col justify-between text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                  OHIF Quad Hanging Protocol
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                  {volume.metadata.deidentifiedCaseId}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Synchronized tri-planar DICOM volume ({volume.width}×{volume.height}×{volume.depth}). Click any plane to jump 3D crosshairs.
              </p>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {OHIF_HANGING_PROTOCOLS.map((proto) => (
                  <button
                    key={proto.id}
                    type="button"
                    onClick={() => applyHangingProtocol(proto.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-colors"
                  >
                    <div className="font-semibold text-[11px] text-neutral-200">{proto.name}</div>
                    <div className="text-[10px] text-neutral-400 truncate">W:{proto.windowWidth} / L:{proto.windowCenter}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono pt-2 border-t border-neutral-800">
              Spacing: {volume.spacing[0]} × {volume.spacing[1]} × {volume.spacing[2]} mm • {volume.metadata.modality}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[340px] select-none cursor-crosshair"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={() => {
            handleCanvasMouseUp();
            setHoverPoint(null);
          }}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDraggingPan ? "none" : "transform 0.1s ease-out",
            }}
            className="relative max-w-full max-h-full"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              className="w-auto h-auto max-h-[500px] object-contain block shadow-2xl rounded-lg"
            />

            {/* Interactive SVG Overlay: Crosshairs + OHIF Calibrated Measurements */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {sliceMeasurements.map((m) => {
                if (m.tool === "length" && m.points.length === 2) {
                  const [a, b] = m.points;
                  return (
                    <g key={m.id}>
                      <line
                        x1={a.x * 100}
                        y1={a.y * 100}
                        x2={b.x * 100}
                        y2={b.y * 100}
                        stroke="#38bdf8"
                        strokeWidth={0.65}
                      />
                      <circle cx={a.x * 100} cy={a.y * 100} r={1.1} fill="#38bdf8" />
                      <circle cx={b.x * 100} cy={b.y * 100} r={1.1} fill="#38bdf8" />
                      <text
                        x={((a.x + b.x) / 2) * 100}
                        y={((a.y + b.y) / 2) * 100 - 1.5}
                        fill="#38bdf8"
                        fontSize="3.2"
                        fontWeight="bold"
                      >
                        {m.summaryText}
                      </text>
                    </g>
                  );
                }
                if (m.tool === "angle" && m.points.length === 3) {
                  const [a, v, b] = m.points;
                  return (
                    <g key={m.id}>
                      <line x1={a.x * 100} y1={a.y * 100} x2={v.x * 100} y2={v.y * 100} stroke="#f472b6" strokeWidth={0.65} />
                      <line x1={v.x * 100} y1={v.y * 100} x2={b.x * 100} y2={b.y * 100} stroke="#f472b6" strokeWidth={0.65} />
                      <circle cx={v.x * 100} cy={v.y * 100} r={1.2} fill="#f472b6" />
                      <text x={v.x * 100 + 1.5} y={v.y * 100 - 1.5} fill="#f472b6" fontSize="3.2" fontWeight="bold">
                        {m.summaryText}
                      </text>
                    </g>
                  );
                }
                if (m.tool === "ellipticalRoi" && m.points.length === 2) {
                  const [c1, c2] = m.points;
                  const cx = ((c1.x + c2.x) / 2) * 100;
                  const cy = ((c1.y + c2.y) / 2) * 100;
                  const rx = Math.max(0.5, (Math.abs(c2.x - c1.x) / 2) * 100);
                  const ry = Math.max(0.5, (Math.abs(c2.y - c1.y) / 2) * 100);
                  return (
                    <g key={m.id}>
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={rx}
                        ry={ry}
                        fill="rgba(34, 197, 94, 0.14)"
                        stroke="#4ade80"
                        strokeWidth={0.6}
                        strokeDasharray="1.5 1"
                      />
                      <text x={cx - rx} y={cy - ry - 1.2} fill="#4ade80" fontSize="2.8" fontWeight="bold">
                        {m.summaryText}
                      </text>
                    </g>
                  );
                }
                return null;
              })}

              {/* Draft tool preview */}
              {draftPoints.length > 0 && hoverPoint && activeTool === "length" && (
                <line
                  x1={draftPoints[0].x * 100}
                  y1={draftPoints[0].y * 100}
                  x2={hoverPoint.x * 100}
                  y2={hoverPoint.y * 100}
                  stroke="#38bdf8"
                  strokeWidth={0.55}
                  strokeDasharray="1.5 1"
                />
              )}
              {draftPoints.length > 0 && hoverPoint && activeTool === "ellipticalRoi" && (
                <ellipse
                  cx={((draftPoints[0].x + hoverPoint.x) / 2) * 100}
                  cy={((draftPoints[0].y + hoverPoint.y) / 2) * 100}
                  rx={Math.max(0.5, (Math.abs(hoverPoint.x - draftPoints[0].x) / 2) * 100)}
                  ry={Math.max(0.5, (Math.abs(hoverPoint.y - draftPoints[0].y) / 2) * 100)}
                  fill="rgba(34, 197, 94, 0.08)"
                  stroke="#4ade80"
                  strokeWidth={0.55}
                  strokeDasharray="1.2 1"
                />
              )}
              {draftPoints.map((dp, i) => (
                <circle key={i} cx={dp.x * 100} cy={dp.y * 100} r={1.1} fill="#fbbf24" />
              ))}
            </svg>

            {/* Synchronized Crosshair Overlay */}
            {showCrosshairs && (
              <div className="absolute inset-0 pointer-events-none">
                <div
                  style={{ left: `${crosshairX}%` }}
                  className="absolute top-0 bottom-0 w-[1px] bg-amber-400/60 shadow-[0_0_4px_rgba(251,191,36,0.6)]"
                />
                <div
                  style={{ top: `${crosshairY}%` }}
                  className="absolute left-0 right-0 h-[1px] bg-amber-400/60 shadow-[0_0_4px_rgba(251,191,36,0.6)]"
                />
              </div>
            )}
          </div>

          {/* Anatomical Orientation Labels */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-amber-400/80 uppercase tracking-widest pointer-events-none bg-black/60 px-2 py-0.5 rounded">
            {activePlane === "axial" ? "Anterior" : "Superior"}
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-amber-400/80 uppercase tracking-widest pointer-events-none bg-black/60 px-2 py-0.5 rounded">
            {activePlane === "axial" ? "Posterior" : "Inferior"}
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400/80 uppercase tracking-widest pointer-events-none bg-black/60 px-2 py-0.5 rounded">
            {activePlane === "sagittal" ? "Anterior" : "Right"}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-400/80 uppercase tracking-widest pointer-events-none bg-black/60 px-2 py-0.5 rounded">
            {activePlane === "sagittal" ? "Posterior" : "Left"}
          </div>

          {/* Slice HUD Overlay + Live HU Pixel Probe */}
          <div className="absolute bottom-3 left-3 bg-neutral-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-xs font-mono space-y-0.5 pointer-events-none">
            <div className="font-bold text-white uppercase text-[11px]">
              {activePlane} Slice {activeSliceIndex + 1} / {maxSlices}
            </div>
            <div className="text-[10px] text-neutral-400">
              W: {windowWidth} • L: {windowCenter} HU {invertGray ? "• INV" : ""}
            </div>
            {probeReading && (
              <div className="text-[10px] text-cyan-300 pt-0.5 border-t border-neutral-800/80">
                HU: <strong>{probeReading.hu}</strong> ({probeReading.tissueLabel})
              </div>
            )}
          </div>

          {/* Metadata Inspector Card */}
          {showMetadata && (
            <div className="absolute top-3 right-3 w-72 p-4 rounded-2xl bg-neutral-900/95 border border-neutral-700 shadow-2xl backdrop-blur-lg text-xs space-y-2.5 z-20">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  DICOM Series Metadata
                </span>
                <button
                  type="button"
                  onClick={() => setShowMetadata(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1 text-neutral-300 font-mono text-[11px]">
                <div><span className="text-neutral-500">Case ID:</span> {volume.metadata.deidentifiedCaseId}</div>
                <div><span className="text-neutral-500">Modality:</span> {volume.metadata.modality}</div>
                <div><span className="text-neutral-500">Description:</span> {volume.metadata.seriesDescription}</div>
                <div><span className="text-neutral-500">Matrix:</span> {volume.width} × {volume.height} × {volume.depth}</div>
                <div><span className="text-neutral-500">Spacing:</span> {volume.spacing[0]} × {volume.spacing[1]} × {volume.spacing[2]} mm</div>
                <div><span className="text-neutral-500">Slice Thickness:</span> {volume.metadata.sliceThickness} mm</div>
                <div className="text-[10px] text-amber-400/90 pt-1 border-t border-neutral-800">
                  ✓ Patient Name/ID masked (OHIF Privacy-first)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expandable OHIF Measurement Tracking & DICOM-SR Drawer */}
      {showMeasurementsPanel && (
        <div className="px-3 sm:px-4 py-2.5 bg-neutral-950/95 border-t border-neutral-800 space-y-2 max-h-44 overflow-y-auto text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] text-cyan-400">
              OHIF Measurement Tracking ({measurements.length})
            </span>
            <div className="flex items-center gap-1.5">
              {measurements.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportDicomSr}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold"
                  >
                    <Download size={11} />
                    <span>Export DICOM-SR JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeasurements([])}
                    className="px-2 py-0.5 rounded-lg bg-neutral-800 hover:bg-rose-900/60 text-neutral-300 text-[10px]"
                  >
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          {measurements.length === 0 ? (
            <p className="text-[11px] text-neutral-500">
              Select Length, Angle, or ROI Stats from OHIF Tools above and click points on the slice to record calibrated measurements.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {measurements.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onPlaneChange?.(m.plane);
                    onSliceChange(m.plane, m.sliceIndex);
                  }}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[11px] text-neutral-200 truncate">
                      #{measurements.length - idx} {m.tool === "ellipticalRoi" ? "ROI" : m.tool.toUpperCase()} — {m.summaryText}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {m.plane.toUpperCase()} Slice {m.sliceIndex + 1}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMeasurements((prev) => prev.filter((item) => item.id !== m.id));
                    }}
                    className="p-1 text-neutral-500 hover:text-rose-400"
                    title="Delete measurement"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Slice Navigation & Window/Level Controls */}
      <div className="p-3 sm:p-4 bg-neutral-950 border-t border-neutral-800 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-400 uppercase w-16">
            Slice
          </span>
          <input
            type="range"
            min={0}
            max={maxSlices - 1}
            value={activeSliceIndex}
            onChange={(e) => onSliceChange(activePlane, parseInt(e.target.value, 10))}
            className="flex-1 accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
          />
          <span className="text-xs font-mono font-bold text-white min-w-[50px] text-right">
            {activeSliceIndex + 1} / {maxSlices}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
              Window/Level:
            </span>
            {Object.entries(CLINICAL_WINDOW_PRESETS).map(([key, preset]) => {
              const active = selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                    active
                      ? "bg-neutral-200 text-neutral-900 font-bold"
                      : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
            <label className="flex items-center gap-1.5">
              <span>W:</span>
              <input
                type="range"
                min={10}
                max={2500}
                value={windowWidth}
                onChange={(e) => {
                  setSelectedPreset("");
                  setWindowWidth(parseInt(e.target.value, 10));
                }}
                className="w-20 accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded"
              />
              <span className="w-10 text-white">{windowWidth}</span>
            </label>
            <label className="flex items-center gap-1.5">
              <span>L:</span>
              <input
                type="range"
                min={-900}
                max={900}
                value={windowCenter}
                onChange={(e) => {
                  setSelectedPreset("");
                  setWindowCenter(parseInt(e.target.value, 10));
                }}
                className="w-20 accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded"
              />
              <span className="w-10 text-white">{windowCenter}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
