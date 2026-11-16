"use client";

import { useState, useEffect, useMemo } from "react";
import type { RadiologyDataset, RadiologyDatasetFilter } from "@/lib/imaging/radiology-hub/types";
import {
  getRadiologyDatasets,
  filterRadiologyDatasets,
  getRadiologyHubMetrics,
  getFineTuningProfile,
} from "@/lib/imaging/radiology-hub/dataset-hub-service";
import { sounds } from "@/app/lib/sound";
import {
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";

interface RadiologyDatasetHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadBenchmarkCase: (benchmarkCaseId: string, auto3D?: boolean) => void;
}

export function RadiologyDatasetHubModal({
  isOpen,
  onClose,
  onLoadBenchmarkCase,
}: RadiologyDatasetHubModalProps) {
  const [datasets, setDatasets] = useState<RadiologyDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RadiologyDatasetFilter>({
    query: "",
    region: "all",
    modality: "all",
    task: "all",
    access: "all",
    hasSegmentation: false,
    hasMultiSequence: false,
  });
  const [calibratedOnly, setCalibratedOnly] = useState(false);
  const [expandedDatasetId, setExpandedDatasetId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getRadiologyDatasets()
      .then((data) => {
        if (isMounted) {
          setDatasets(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const metrics = useMemo(() => getRadiologyHubMetrics(datasets), [datasets]);

  const filteredDatasets = useMemo(() => {
    let list = filterRadiologyDatasets(datasets, filter);
    if (calibratedOnly) {
      list = list.filter((d) => d.benchmarkCaseId !== undefined);
    }
    return list;
  }, [datasets, filter, calibratedOnly]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col rounded-3xl bg-neutral-900 border border-neutral-700/80 shadow-2xl overflow-hidden text-neutral-100">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 bg-neutral-950/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Radiology Dataset Hub Explorer
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  474 Curated Datasets
                </span>
              </div>
              <p className="text-xs text-neutral-400 pt-0.5">
                Standardized open-access CT, MRI, PET, and X-ray datasets curated by Jung Oh Lee with clinical ground truth benchmarks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://jungohlee.github.io/radiology-dataset-hub/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 hover:border-neutral-500 bg-neutral-800/80 text-neutral-300 hover:text-white text-xs font-medium transition-all"
            >
              <span>Hub Webpage</span>
              <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-900/90 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap text-neutral-400 font-mono text-[11px]">
            <div>
              <span className="text-white font-bold">{metrics.total}</span> Total Datasets
            </div>
            <div>
              <span className="text-cyan-400 font-bold">{metrics.modalitiesCount["MRI"] || 0}</span> MRI
            </div>
            <div>
              <span className="text-amber-400 font-bold">{metrics.modalitiesCount["CT"] || 0}</span> CT
            </div>
            <div>
              <span className="text-indigo-400 font-bold">{metrics.modalitiesCount["X-ray"] || 0}</span> X-Ray
            </div>
            <div>
              <span className="text-emerald-400 font-bold">{metrics.withSegmentation}</span> Segmentation Ground Truth
            </div>
            <div>
              <span className="text-purple-400 font-bold">{metrics.openAccess}</span> Open Access
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 font-medium">
            Showing <strong className="text-amber-400">{filteredDatasets.length}</strong> matching datasets
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/40 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search datasets by name, organ, disease (e.g. BraTS, Lung, Liver, Glioblastoma, Spine)..."
                value={filter.query}
                onChange={(e) => setFilter((prev) => ({ ...prev, query: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-800/80 border border-neutral-700 focus:border-amber-500 focus:outline-none text-sm text-neutral-200 placeholder-neutral-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setCalibratedOnly(!calibratedOnly);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                calibratedOnly
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                  : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
              }`}
            >
              <Sparkles size={14} className={calibratedOnly ? "text-amber-400" : ""} />
              <span>⚡ Calibrated 1-Click Benchmarks Only</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Filter size={13} />
              <span>Filters:</span>
            </div>

            {/* Modality Filter */}
            <select
              value={filter.modality}
              onChange={(e) => setFilter((prev) => ({ ...prev, modality: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none"
            >
              <option value="all">All Modalities</option>
              <option value="CT">CT (Computed Tomography)</option>
              <option value="MRI">MRI (Magnetic Resonance)</option>
              <option value="X-ray">X-ray / Radiography</option>
              <option value="PET">PET (Positron Emission)</option>
              <option value="DXA">DXA</option>
            </select>

            {/* Region Filter */}
            <select
              value={filter.region}
              onChange={(e) => setFilter((prev) => ({ ...prev, region: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none"
            >
              <option value="all">All Anatomical Regions</option>
              <option value="Neuro">Neuro (Brain & Spine)</option>
              <option value="Chest">Chest & Thorax</option>
              <option value="Abdomen">Abdomen & Viscera</option>
              <option value="MSK">Musculoskeletal (MSK)</option>
              <option value="Cardiac">Cardiac & Coronary</option>
              <option value="Pelvis">Pelvis & Prostate</option>
              <option value="Vascular">Vascular & Angiography</option>
              <option value="Breast">Breast</option>
              <option value="HeadNeck">Head & Neck</option>
              <option value="WholeBody">Whole-Body</option>
            </select>

            {/* Task Filter */}
            <select
              value={filter.task}
              onChange={(e) => setFilter((prev) => ({ ...prev, task: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none"
            >
              <option value="all">All Tasks</option>
              <option value="segmentation">Segmentation</option>
              <option value="classification">Classification</option>
              <option value="detection">Detection</option>
              <option value="reconstruction">Reconstruction</option>
            </select>

            {/* Access Filter */}
            <select
              value={filter.access}
              onChange={(e) => setFilter((prev) => ({ ...prev, access: e.target.value }))}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none"
            >
              <option value="all">All Access Models</option>
              <option value="open">Open Access</option>
              <option value="registration">Registration Required</option>
              <option value="credentialed">Credentialed / DUA</option>
            </select>

            {/* Quick Checkbox: Segmentation */}
            <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer pl-2">
              <input
                type="checkbox"
                checked={filter.hasSegmentation}
                onChange={(e) => setFilter((prev) => ({ ...prev, hasSegmentation: e.target.checked }))}
                className="rounded bg-neutral-800 border-neutral-700 text-amber-500 focus:ring-0"
              />
              <span>Has Segmentation Labels</span>
            </label>
          </div>
        </div>

        {/* Datasets List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-neutral-400">
              <Activity className="animate-spin text-amber-500" size={32} />
              <p className="text-sm font-medium">Loading 474 Radiology Datasets...</p>
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-neutral-400">
              <Database size={40} className="text-neutral-600" />
              <p className="text-base font-semibold">No datasets matched your filters</p>
              <button
                type="button"
                onClick={() => {
                  setFilter({
                    query: "",
                    region: "all",
                    modality: "all",
                    task: "all",
                    access: "all",
                    hasSegmentation: false,
                    hasMultiSequence: false,
                  });
                  setCalibratedOnly(false);
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredDatasets.map((dataset) => {
              const isExpanded = expandedDatasetId === dataset.id;
              const fineTuningProfile = getFineTuningProfile(dataset.id);
              const isCalibrated = dataset.benchmarkCaseId !== undefined;

              return (
                <div
                  key={dataset.id}
                  className={`rounded-2xl border transition-all ${
                    isCalibrated
                      ? "border-amber-500/40 bg-gradient-to-r from-amber-500/5 via-neutral-900 to-neutral-900 shadow-md"
                      : "border-neutral-800 bg-neutral-900/70 hover:border-neutral-700"
                  } p-4 sm:p-5 space-y-3.5`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                          {dataset.name}
                          {isCalibrated && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Award size={11} />
                              Calibrated Benchmark
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono">({dataset.year})</span>
                      </div>

                      <div className="text-xs font-medium text-neutral-400">
                        {dataset.full_name}
                      </div>
                    </div>

                    {/* Modality & Region Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {dataset.modality?.map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono"
                        >
                          {m}
                        </span>
                      ))}
                      {dataset.regions?.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {dataset.description}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-neutral-400 font-mono pt-1">
                    <div>
                      <span className="text-neutral-500">Cohort:</span>{" "}
                      <strong className="text-neutral-200">{dataset.size}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500">Format:</span>{" "}
                      <span className="text-neutral-200">{dataset.format?.join(", ")}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">License:</span>{" "}
                      <span className="text-neutral-200">{dataset.license || "Research Access"}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Host:</span>{" "}
                      <span className="text-neutral-200">{dataset.host}</span>
                    </div>
                  </div>

                  {dataset.segmentation_detail && (
                    <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-[11px] text-neutral-300 flex items-start gap-2">
                      <Tag size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-neutral-200 font-semibold">Segmentation Ground Truth:</strong>{" "}
                        {dataset.segmentation_detail}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/80">
                    <div className="flex items-center gap-2">
                      {isCalibrated && dataset.benchmarkCaseId && (
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playCelebration();
                            onLoadBenchmarkCase(dataset.benchmarkCaseId!, false);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Sparkles size={13} />
                          <span>⚡ Load 2D/3D Benchmark Study</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setExpandedDatasetId(isExpanded ? null : dataset.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-700 hover:border-neutral-500 bg-neutral-800/80 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
                      >
                        <Cpu size={12} className="text-cyan-400" />
                        <span>Fine-Tuning & Architecture Guide</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>

                    <a
                      href={dataset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:underline"
                    >
                      <span>Official Host Repository</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Expanded Fine-Tuning Drawer */}
                  {isExpanded && (
                    <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 animate-fade-in text-xs">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Cpu size={14} />
                          Clinical Deep Learning & Fine-Tuning Specifications
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          Based on MICCAI / RSNA Challenge Protocols
                        </span>
                      </div>

                      {fineTuningProfile ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-neutral-300">
                          <div className="space-y-1.5">
                            <div>
                              <span className="text-neutral-500 font-semibold">Recommended Architecture:</span>
                              <div className="font-mono text-cyan-300 pt-0.5">{fineTuningProfile.recommendedArchitecture}</div>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-semibold">Optimization Loss Formulation:</span>
                              <div className="font-mono text-amber-300 pt-0.5">{fineTuningProfile.recommendedLoss}</div>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-semibold">Intensity Normalization:</span>
                              <div className="pt-0.5 text-neutral-300">{fineTuningProfile.intensityNormalization.description}</div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div>
                              <span className="text-neutral-500 font-semibold">Validation & Data Splits:</span>
                              <div className="pt-0.5">{fineTuningProfile.dataSplitsRecommended}</div>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-semibold">Target Evaluation Metrics:</span>
                              <div className="font-mono text-emerald-400 pt-0.5">{fineTuningProfile.evaluationMetrics.join(" • ")}</div>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-semibold">Clinical Significance:</span>
                              <div className="pt-0.5 text-neutral-400 leading-relaxed">{fineTuningProfile.clinicalSignificance}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-neutral-300">
                          <div>
                            <span className="text-neutral-500 font-semibold">Label Scheme / Annotations:</span>
                            <div className="pt-0.5">
                              {dataset.details?.label_schema ? (
                                <ul className="list-disc list-inside space-y-0.5 text-neutral-300 font-mono text-[11px]">
                                  {dataset.details.label_schema.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span>{dataset.segmentation_detail || "Multi-class anatomical contours."}</span>
                              )}
                            </div>
                          </div>
                          {dataset.details?.file_structure && (
                            <div>
                              <span className="text-neutral-500 font-semibold">File Hierarchy:</span>
                              <div className="font-mono text-[11px] text-cyan-300 pt-0.5">{dataset.details.file_structure}</div>
                            </div>
                          )}
                          <div>
                            <span className="text-neutral-500 font-semibold">Recommended General Protocol:</span>
                            <p className="pt-0.5 text-neutral-400">
                              3D U-Net or nnU-Net baseline with Soft Dice + Cross Entropy loss. For CT scans, window clip HU to region of interest prior to resampling. For MR scans, perform N4 bias-field correction and non-zero voxel z-score standardization.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
