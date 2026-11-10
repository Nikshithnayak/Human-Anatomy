"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { MedicalVolume, type VolumePlane } from "@/lib/imaging/volume-model";
import {
  parseDicomSlice,
  extractEmbeddedImageBlob,
  stackDicomSlicesToVolume,
  type ParsedDicomSlice,
} from "@/lib/imaging/dicom-parser";
import {
  HounsfieldThresholdProvider,
  SUPPORTED_STRUCTURES,
  type SegmentationResult,
} from "@/lib/imaging/segmentation-engine";
import {
  reconstructSurfacesFromSegmentation,
  type ReconstructionResult,
} from "@/lib/imaging/surface-reconstruction";
import {
  REFERENCE_STUDIES,
  generateReferenceThoracicVolume,
  generateReferenceAbdominalVolume,
} from "@/lib/imaging/reference-studies";
import {
  convertImageToMedicalVolume,
  analyzeMedicalVolumeAnatomy,
  type AnatomicalLocationReport,
} from "@/lib/imaging/image-to-volume";
import { MprSliceViewer } from "./MprSliceViewer";
import { SegmentationReviewOverlay } from "./SegmentationReviewOverlay";
import { PatientSpecific3DViewer } from "./PatientSpecific3DViewer";
import { EducationalDisclaimerBanner } from "./EducationalDisclaimerBanner";
import { sounds } from "@/app/lib/sound";
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  Database,
  Eye,
  FileImage,
  FileUp,
  Info,
  Layers,
  MapPin,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Split,
  Target,
  UploadCloud,
  X,
} from "lucide-react";
import { NormalVsAbnormalComparator } from "./NormalVsAbnormalComparator";
import { OhifWorkstationPanel } from "./OhifWorkstationPanel";

export type ImagingStage =
  | "upload"
  | "review-scan"
  | "segment"
  | "review-segmentation"
  | "explorer-3d";

export type MedicalImagingCenterMode =
  | "ct-mri-mpr"
  | "normal-vs-abnormal"
  | "ohif-dicomweb";

interface ImagingWorkspaceProps {
  onClose?: () => void;
  onReturnToCase?: () => void;
  onOpenAtlas?: () => void;
  theme?: "light" | "dark";
  language?: string;
  initialStudyId?: string | null;
}

export function ImagingWorkspace({
  onClose,
  onReturnToCase,
  onOpenAtlas,
  theme = "light",
  language = "en",
  initialStudyId = null,
}: ImagingWorkspaceProps) {
  const [workspaceMode, setWorkspaceMode] = useState<MedicalImagingCenterMode>("ct-mri-mpr");
  const [stage, setStage] = useState<ImagingStage>("upload");
  const [uploadMode, setUploadMode] = useState<"dicom" | "image">("dicom");
  const [volume, setVolume] = useState<MedicalVolume | null>(null);
  const [locationReport, setLocationReport] = useState<AnatomicalLocationReport | null>(null);
  const [segmentation, setSegmentation] = useState<SegmentationResult | null>(null);
  const [reconstruction, setReconstruction] = useState<ReconstructionResult | null>(null);

  const [activePlane, setActivePlane] = useState<VolumePlane>("axial");
  const [sliceIndices, setSliceIndices] = useState({
    axial: 32,
    coronal: 64,
    sagittal: 64,
  });

  const [selectedStructures, setSelectedStructures] = useState<string[]>([
    "bone-spine",
    "bone-ribs",
    "lungs-bilateral",
    "heart-mediastinum",
    "thoracic-aorta",
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const segmentationEngine = useMemo(() => new HounsfieldThresholdProvider(), []);

  const handleSliceChange = (plane: VolumePlane, nextIndex: number) => {
    setSliceIndices((prev) => ({
      ...prev,
      [plane]: nextIndex,
    }));
  };

  // Auto-load reference study if launched from a clinical case
  useEffect(() => {
    if (initialStudyId) {
      handleLoadReferenceStudy(initialStudyId);
    }
  }, [initialStudyId]);

  // 1. Quick Load Reference Scans (supports standard review and 1-Click direct 3D generation)
  const handleLoadReferenceStudy = (studyId: string, auto3D: boolean = false) => {
    sounds.playClick();
    setIsProcessing(true);
    setProcessingMessage(
      auto3D
        ? "1-Click Auto Pipeline: Loading volumetric CT & synthesizing 3D anatomical model..."
        : "Synthesizing calibrated volumetric CT density field..."
    );

    setTimeout(() => {
      let loadedVolume: MedicalVolume;
      if (studyId === "study-ct-abdomen") {
        loadedVolume = generateReferenceAbdominalVolume();
        setSelectedStructures(["bone-spine", "liver", "kidneys-bilateral"]);
      } else {
        loadedVolume = generateReferenceThoracicVolume();
        setSelectedStructures([
          "bone-spine",
          "bone-ribs",
          "lungs-bilateral",
          "heart-mediastinum",
          "thoracic-aorta",
        ]);
      }

      const report = analyzeMedicalVolumeAnatomy(loadedVolume);
      loadVolumeAndReport(loadedVolume, report, auto3D);
      setIsProcessing(false);
    }, 250);
  };

  // Helper to load volume and anatomical classification report
  const loadVolumeAndReport = (
    vol: MedicalVolume,
    report: AnatomicalLocationReport,
    auto3D: boolean = false
  ) => {
    setUploadError(null);
    setVolume(vol);
    setLocationReport(report);

    // Pre-select matching structures from anatomical classification
    if (report.detectedStructures.length > 0) {
      const matchedIds = report.detectedStructures
        .map((s) => s.structureId)
        .filter((id) => SUPPORTED_STRUCTURES.some((st) => st.id === id));
      if (matchedIds.length > 0) {
        setSelectedStructures(matchedIds);
      }
    }

    setSliceIndices({
      axial: Math.floor(vol.depth / 2),
      coronal: Math.floor(vol.height / 2),
      sagittal: Math.floor(vol.width / 2),
    });
    setSegmentation(null);
    setReconstruction(null);

    if (auto3D) {
      handleQuick3DReconstructionForVolume(vol, report);
    } else {
      setStage("review-scan");
      sounds.playCelebration();
    }
  };

  // 2. Client-Side Scan Upload (Fail-safe: Handles standard DICOM Part 10, Encapsulated DICOM, PNG/JPG/WebP/BMP)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadError(null);

    const file = files[0];
    const isImageFile =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name);

    try {
      if (isImageFile) {
        setProcessingMessage("Analyzing medical image, classifying anatomical region & mapping 3D human body level...");
        const { volume: imgVol, report } = await convertImageToMedicalVolume(file);
        loadVolumeAndReport(imgVol, report);
      } else {
        setProcessingMessage("Parsing binary DICOM Part 10 series via OHIF dicom-parser & masking PHI...");
        const fileList = Array.from(files);
        let loadedVol: MedicalVolume | null = null;
        let loadedReport: AnatomicalLocationReport | null = null;

        try {
          const parsedSlices: ParsedDicomSlice[] = [];
          for (const dcmFile of fileList) {
            const buf = await dcmFile.arrayBuffer();
            parsedSlices.push(parseDicomSlice(buf, dcmFile.name));
          }
          const vol = stackDicomSlicesToVolume(parsedSlices);
          loadedVol = vol;
          loadedReport = analyzeMedicalVolumeAnatomy(vol);
        } catch (dicomErr: unknown) {
          const buffer = await file.arrayBuffer();
          // Try 2: Encapsulated image in DICOM (JPEG/PNG transfer syntax) or renamed image file
          console.warn("Standard DICOM parse notice, testing embedded/image decoder:", dicomErr);
          const embeddedBlob = extractEmbeddedImageBlob(buffer);
          const targetBlob = embeddedBlob || file;

          try {
            setProcessingMessage("Decoding medical image cross-section & mapping 3D anatomical position...");
            const { volume: imgVol, report } = await convertImageToMedicalVolume(targetBlob);
            loadedVol = imgVol;
            loadedReport = report;
          } catch (_imgErr) {
            // If neither uncompressed DICOM nor image format worked, throw informative error with 1-click recovery
            throw new Error(
              "This file could not be parsed as an uncompressed DICOM or standard medical image (.dcm, .png, .jpg, .webp). You can test instantly with the curated reference scans below."
            );
          }
        }

        if (loadedVol && loadedReport) {
          loadVolumeAndReport(loadedVol, loadedReport);
        }
      }
      if (event.target) {
        event.target.value = "";
      }
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "Failed to parse uploaded file.";
      setUploadError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Run Real Hounsfield Density Segmentation
  const handleRunSegmentation = async () => {
    if (!volume) return;
    setIsProcessing(true);
    setProcessingMessage("Segmenting structures via Hounsfield attenuation thresholds & spatial region masks...");

    try {
      const result = await segmentationEngine.segment(volume, {
        structures: selectedStructures,
        algorithm: "hu-threshold",
      });

      setSegmentation(result);
      setStage("review-segmentation");
      sounds.playCelebration();
    } catch (err) {
      console.error("Segmentation error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Run 3D Surface Reconstruction
  const handleGenerate3D = () => {
    if (!volume || !segmentation) return;
    setIsProcessing(true);
    setProcessingMessage("Extracting 3D surface geometry, calculating vertex normals, and assembling Three.js meshes...");

    setTimeout(() => {
      const result = reconstructSurfacesFromSegmentation(volume, segmentation, {
        downsampleFactor: 1,
        smoothingPasses: 2,
        scaleMmToScene: 0.015,
      });

      setReconstruction(result);
      setStage("explorer-3d");
      setIsProcessing(false);
      sounds.playCelebration();
    }, 300);
  };

  // 1-Click Easy Track: Automatically segment and reconstruct 3D anatomy without manual intermediate steps
  const handleQuick3DReconstructionForVolume = async (
    targetVol: MedicalVolume,
    targetReport?: AnatomicalLocationReport | null
  ) => {
    setIsProcessing(true);
    setProcessingMessage("1-Click Auto Pipeline: Calibrating voxel densities and segmenting anatomical boundaries...");

    try {
      let structuresToSegment = selectedStructures.length > 0 ? selectedStructures : ["bone-spine", "liver", "lungs-bilateral"];
      if (targetReport && targetReport.detectedStructures.length > 0) {
        const detected = targetReport.detectedStructures
          .map((s) => s.structureId)
          .filter((id) => SUPPORTED_STRUCTURES.some((st) => st.id === id));
        if (detected.length > 0) {
          structuresToSegment = detected;
          setSelectedStructures(detected);
        }
      }

      const segResult = await segmentationEngine.segment(targetVol, {
        structures: structuresToSegment,
        algorithm: "hu-threshold",
      });
      setSegmentation(segResult);

      setProcessingMessage("Generating interactive 3D anatomical meshes and preparing Three.js viewport...");
      setTimeout(() => {
        const reconResult = reconstructSurfacesFromSegmentation(targetVol, segResult, {
          downsampleFactor: 1,
          smoothingPasses: 2,
          scaleMmToScene: 0.015,
        });
        setReconstruction(reconResult);
        setStage("explorer-3d");
        setIsProcessing(false);
        sounds.playCelebration();
      }, 350);
    } catch (err) {
      console.error("Quick 3D reconstruction error:", err);
      setUploadError("Could not generate 3D model: " + (err instanceof Error ? err.message : "Internal engine error"));
      setIsProcessing(false);
    }
  };

  const handleQuick3DReconstruction = async () => {
    if (!volume) return;
    await handleQuick3DReconstructionForVolume(volume, locationReport);
  };

  const stagesList = [
    { key: "upload", label: "Upload & Select" },
    { key: "review-scan", label: "Review Scan (MPR)" },
    { key: "segment", label: "Segmentation" },
    { key: "review-segmentation", label: "Review Contours" },
    { key: "explorer-3d", label: "3D Explorer" },
  ];

  return (
    <div className="w-full max-w-[1720px] mx-auto flex-1 h-full flex flex-col min-h-0 py-2 sm:py-3 px-2 sm:px-4 space-y-3 overflow-hidden">
      {/* Top Header & Pipeline Stage Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-[#755b46]/15 dark:border-neutral-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <Activity size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-900 dark:text-neutral-50 leading-tight flex items-center gap-2">
              <span>Patient Scan & 3D Imaging Lab</span>
              {volume && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-semibold">
                  {volume.metadata.deidentifiedCaseId}
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Transform clinical CT/MRI volumetric scans into patient-specific 3D anatomical models.
            </p>
          </div>
        </div>

        {/* Stepper Pipeline Pills */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-xs">
          {stagesList.map((s, idx) => {
            const active = stage === s.key;
            return (
              <div key={s.key} className="flex items-center">
                <span
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    active
                      ? "bg-[#2c2623] text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {idx + 1}. {s.label}
                </span>
                {idx < stagesList.length - 1 && (
                  <ChevronRight size={14} className="text-neutral-400 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {onReturnToCase && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onReturnToCase();
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
            >
              <Activity size={13} />
              <span>Return to Case</span>
            </button>
          )}

          {volume && stage !== "upload" && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStage("upload");
              }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Change Scan</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Medical Imaging Center Specialized Modality Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white/60 dark:bg-neutral-900/60 border border-[#755b46]/10 dark:border-neutral-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setWorkspaceMode("ct-mri-mpr");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              workspaceMode === "ct-mri-mpr"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <Activity size={13} />
            <span>CT/MRI MPR Viewer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setWorkspaceMode("normal-vs-abnormal");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              workspaceMode === "normal-vs-abnormal"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <Split size={13} />
            <span>Normal vs. Abnormal Comparative Lab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setWorkspaceMode("ohif-dicomweb");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              workspaceMode === "ohif-dicomweb"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <Database size={13} />
            <span>OHIF Viewers & DICOMweb</span>
          </button>
        </div>

        <span className="text-[10px] text-neutral-400 font-mono hidden xl:inline">
          Anatomy Atelier Integrated Imaging Center
        </span>
      </div>

      {/* Mandatory Educational Safety Banner */}
      <EducationalDisclaimerBanner
        stage={
          workspaceMode !== "ct-mri-mpr"
            ? "raw"
            : stage === "upload" || stage === "review-scan"
            ? "raw"
            : stage === "review-segmentation"
            ? "segmented"
            : stage === "explorer-3d"
            ? "explorer"
            : "reconstructed"
        }
      />

      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 pb-8">
        {workspaceMode === "normal-vs-abnormal" ? (
          <NormalVsAbnormalComparator theme={theme} />
        ) : workspaceMode === "ohif-dicomweb" ? (
          <OhifWorkstationPanel
            onOpenMprWithProtocol={() => {
              setWorkspaceMode("ct-mri-mpr");
              if (!volume) {
                handleLoadReferenceStudy("study-ct-thorax", false);
              } else {
                setStage("review-scan");
              }
            }}
            onOpenLocalSeriesUpload={() => {
              setWorkspaceMode("ct-mri-mpr");
              setStage("upload");
              setUploadMode("dicom");
            }}
          />
        ) : (
          <>
            {/* Loading Overlay */}
            {isProcessing && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-700 text-center max-w-sm w-full space-y-4 shadow-2xl">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-spin">
                    <Boxes size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Processing Volumetric Pipeline</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">{processingMessage}</p>
                  </div>
                </div>
              </div>
            )}

        {/* STAGE 1: UPLOAD & SELECT SCAN */}
        {stage === "upload" && (
          <div className="w-full max-w-[1550px] mx-auto py-2 space-y-5">
            {/* Upload Zone with Format Tabs */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-neutral-900/80 border-2 border-dashed border-[#755b46]/25 dark:border-neutral-700 text-center space-y-5 hover:border-amber-500/60 transition-colors">
              {/* Format Toggle Pill */}
              <div className="inline-flex p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setUploadMode("dicom");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold transition-all ${
                    uploadMode === "dicom"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  <Activity size={14} />
                  <span>DICOM Part 10 (.dcm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setUploadMode("image");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold transition-all ${
                    uploadMode === "image"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  <FileImage size={14} />
                  <span>Medical Image (.png, .jpg, .webp)</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple={uploadMode === "dicom"}
                accept={
                  uploadMode === "dicom"
                    ? ".dcm,.dicom,application/dicom"
                    : "image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp"
                }
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                {uploadMode === "dicom" ? <UploadCloud size={32} /> : <FileImage size={32} />}
              </div>

              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-50">
                  {uploadMode === "dicom"
                    ? "Upload Patient DICOM Scan"
                    : "Upload Medical Scan Image"}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                  {uploadMode === "dicom" ? (
                    <>
                      Drag and drop a <strong>.dcm</strong> CT/MRI file, or select from your device. All patient identifiers are strictly masked client-side in memory.
                    </>
                  ) : (
                    <>
                      Upload any standard <strong>PNG, JPG, or WebP</strong> cross-sectional CT/MRI image. The spatial mapper will localize its anatomical position on the 3D human body atlas.
                    </>
                  )}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 rounded-2xl bg-[#2c2623] hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {uploadMode === "dicom" ? "Select DICOM (.dcm) File" : "Select Image (.png, .jpg, .webp)"}
                </button>
              </div>

              {uploadError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs max-w-lg mx-auto space-y-2.5 leading-relaxed">
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200">{uploadError}</div>
                  <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadReferenceStudy("study-ct-thorax", true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      ⚡ 1-Click Demo Thorax CT (3D)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadReferenceStudy("study-ct-abdomen", true)}
                      className="px-3 py-1.5 rounded-xl bg-[#2c2623] hover:bg-neutral-800 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      ⚡ 1-Click Demo Abdomen CT (3D)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Curated Educational Reference Scans */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                    Or Load Educational Reference Scans
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Pre-calibrated volumetric CT scans with authentic Hounsfield Unit density fields ready for end-to-end 3D reconstruction.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Instant Load
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REFERENCE_STUDIES.map((study) => (
                  <div
                    key={study.id}
                    className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-neutral-900/80 border border-[#755b46]/20 dark:border-neutral-800 hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {study.modality} • {study.anatomyRegion}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          {study.sliceCount} Slices
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {study.title}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {study.description}
                      </p>

                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                        {study.targetStructures.map((structId) => {
                          const struct = SUPPORTED_STRUCTURES.find((s) => s.id === structId);
                          return (
                            <span
                              key={structId}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300 font-medium"
                            >
                              {struct?.name || structId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadReferenceStudy(study.id, false)}
                        className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        Inspect 2D Slices
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadReferenceStudy(study.id, true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Sparkles size={13} />
                        <span>⚡ 1-Click 3D Model</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: REVIEW SCAN (MPR VIEWER) + ANATOMICAL BODY MAPPER */}
        {stage === "review-scan" && volume && (
          <div className="space-y-4">
            {/* Top Action Header */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/80 border border-[#755b46]/20 dark:border-neutral-800 shadow-sm backdrop-blur-md">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-50">
                  Multiplanar Reconstruction (MPR) Review
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Inspect the volumetric CT series in Axial, Coronal, and Sagittal planes. Adjust Window/Level to evaluate anatomical contrast.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuick3DReconstruction}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                  title="Generate 3D Model Immediately without manual tuning"
                >
                  <Sparkles size={16} />
                  <span>1-Click Auto 3D Model</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setStage("segment");
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#2c2623] hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-bold shadow-md transition-all"
                >
                  <span>Step-by-Step Segmentation</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Anatomical Body Mapper & Structure Findings Card */}
            {locationReport && (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-cyan-500/10 dark:from-amber-950/30 dark:via-neutral-900/60 dark:to-cyan-950/30 border border-amber-500/30 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#755b46]/15 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>Anatomical Body Location:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                          {locationReport.region} ({locationReport.estimatedLevel})
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Spatial positioning mapped onto the 3D human body atlas with identified anatomical landmarks.
                      </p>
                    </div>
                  </div>

                  {/* Body Z-Height Badge */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400 font-medium">Body Atlas Level:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {Math.round(locationReport.bodyZNormalized * 100)}% Height
                    </span>
                  </div>
                </div>

                {/* Spatial Finding & Detected Structures Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Where & What Happened Explanation */}
                  <div className="md:col-span-2 space-y-2 p-3.5 rounded-2xl bg-white/60 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Info size={13} />
                      <span>Anatomical Analysis & Findings:</span>
                    </span>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
                      {locationReport.explanation}
                    </p>
                  </div>

                  {/* Detected Anatomical Structures */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-white/60 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Recognized Structures ({locationReport.detectedStructures.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {locationReport.detectedStructures.map((struct) => (
                        <div
                          key={struct.name}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[11px]"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: struct.recommendedColor }}
                          />
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {struct.name}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            {Math.round(struct.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="min-h-[560px] flex flex-col">
              <MprSliceViewer
                volume={volume}
                activePlane={activePlane}
                onPlaneChange={setActivePlane}
                currentSliceIndices={sliceIndices}
                onSliceChange={handleSliceChange}
              />
            </div>
          </div>
        )}

        {/* STAGE 3: SELECT STRUCTURES & CONFIGURE SEGMENTATION */}
        {stage === "segment" && volume && (
          <div className="w-full max-w-[1550px] mx-auto py-2 space-y-4">
            <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-neutral-900/80 border border-[#755b46]/20 dark:border-neutral-800 shadow-sm space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Anatomical Target Selection
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-50">
                  Select Anatomical Structures to Segment
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Only anatomically supported structures with validated Hounsfield Unit density ranges are available.
                </p>
              </div>

              {/* Supported Structure Selection Cards in 3 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {SUPPORTED_STRUCTURES.map((s) => {
                  const isChecked = selectedStructures.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        sounds.playClick();
                        setSelectedStructures((prev) =>
                          isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        );
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/30"
                          : "border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-800/40 opacity-75"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-4 h-4 rounded-md shrink-0 shadow-sm"
                          style={{ backgroundColor: s.colorHex }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {s.name}
                          </h4>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                            {s.description}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? "bg-amber-500 border-amber-600 text-white"
                            : "border-neutral-300 dark:border-neutral-600"
                        }`}
                      >
                        {isChecked && <CheckCircle2 size={13} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Segmentation Engine Information */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                <span className="font-bold text-neutral-800 dark:text-neutral-200 text-[11px] uppercase tracking-wide">
                  Active Segmentation Engine:
                </span>
                <p className="text-[11px] leading-relaxed">
                  {segmentationEngine.name} • Physical attenuation thresholding with 3D anatomical spatial bounding constraints.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStage("review-scan")}
                  className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Back to Scan
                </button>

                <button
                  type="button"
                  disabled={selectedStructures.length === 0}
                  onClick={handleRunSegmentation}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2c2623] hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  <span>Execute Segmentation ({selectedStructures.length})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: REVIEW SEGMENTATION CONTOURS (MANDATORY VERIFICATION) */}
        {stage === "review-segmentation" && volume && segmentation && (
          <SegmentationReviewOverlay
            volume={volume}
            segmentation={segmentation}
            onAcceptAndGenerate3D={handleGenerate3D}
            onAdjustParameters={() => setStage("segment")}
            onReject={() => setStage("review-scan")}
          />
        )}

        {/* STAGE 5: PATIENT-SPECIFIC 3D EXPLORER & SLICE SYNCHRONIZATION */}
        {stage === "explorer-3d" && volume && reconstruction && (
          <div className="space-y-4">
            {/* WHERE & WHAT HAPPENED: Anatomical Location & Clinical Findings Card */}
            {locationReport && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-cyan-500/10 dark:from-amber-950/30 dark:via-neutral-900/60 dark:to-cyan-950/30 border border-amber-500/30 dark:border-neutral-800 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#755b46]/15 dark:border-neutral-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>WHERE on Body:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                          {locationReport.region} ({locationReport.estimatedLevel})
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Mapped to 3D Human Body Atlas at {Math.round(locationReport.bodyZNormalized * 100)}% height level.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-xl bg-white/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {reconstruction.structures.length} 3D Meshes Reconstructed
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1.5 p-3 rounded-2xl bg-white/60 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Info size={13} />
                      <span>WHAT HAPPENED & ANATOMICAL FINDINGS:</span>
                    </span>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
                      {locationReport.explanation}
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-white/60 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Recognized Anatomy ({locationReport.detectedStructures.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {locationReport.detectedStructures.map((struct) => (
                        <div
                          key={struct.name}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[10px]"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: struct.recommendedColor }}
                          />
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {struct.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Split View: 2D MPR Slice Viewer + 3D Three.js Patient Model */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
              {/* Left Column: Synchronized 2D Cross-Section Slice Viewer */}
              <div className="flex flex-col min-h-[500px]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Crosshair size={14} className="text-amber-500" />
                    <span>Synchronized 2D Slice Viewer</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Moving slice updates 3D plane in real-time
                  </span>
                </div>
                <div className="flex-1 flex flex-col">
                  <MprSliceViewer
                    volume={volume}
                    activePlane={activePlane}
                    onPlaneChange={setActivePlane}
                    currentSliceIndices={sliceIndices}
                    onSliceChange={handleSliceChange}
                    maskOverlay={
                      segmentation
                        ? {
                            mask: segmentation.mask,
                            colorMap: (() => {
                              const map: Record<number, [number, number, number, number]> = {};
                              segmentation.structures.forEach((s) => {
                                const [r, g, b] = s.defaultColor;
                                map[s.labelIndex] = [r, g, b, 0.45];
                              });
                              return map;
                            })(),
                            opacity: 0.5,
                          }
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Right Column: 3D Patient-Specific Three.js Viewer */}
              <div className="flex flex-col min-h-[500px]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Boxes size={14} className="text-amber-500" />
                    <span>Patient-Specific 3D Anatomical Mesh</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Tap any organ to sync 2D slice
                  </span>
                </div>
                <div className="flex-1 flex flex-col">
                  <PatientSpecific3DViewer
                    volume={volume}
                    reconstruction={reconstruction}
                    activePlane={activePlane}
                    sliceIndices={sliceIndices}
                    onSliceChange={handleSliceChange}
                    onPlaneChange={setActivePlane}
                    theme={theme}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
