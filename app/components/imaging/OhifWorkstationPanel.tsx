"use client";

import { useEffect, useState } from "react";
import {
  OHIF_DICOMWEB_PRESETS,
  OHIF_HANGING_PROTOCOLS,
  queryOhifDicomWebStudies,
  type DicomWebStudySummary,
} from "@/lib/imaging/ohif-bridge";
import { imagingService } from "@/integrations/imaging/imaging.service";
import { sounds } from "@/app/lib/sound";
import {
  Activity,
  ArrowUpRight,
  Database,
  ExternalLink,
  FolderGit2,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

interface OhifWorkstationPanelProps {
  onOpenMprWithProtocol: (protocolId: string) => void;
  onOpenLocalSeriesUpload: () => void;
}

interface OhifApiStatus {
  version?: string;
  license?: string;
  repository?: string;
  localPath?: string;
  embeddedPackages?: { dicomParser?: string; dcmjs?: string };
  supportedModes?: string[];
  companionApp?: { script?: string; defaultUrl?: string; note?: string };
}

export function OhifWorkstationPanel({
  onOpenMprWithProtocol,
  onOpenLocalSeriesUpload,
}: OhifWorkstationPanelProps) {
  const [ohifInfo, setOhifInfo] = useState<OhifApiStatus | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState(OHIF_DICOMWEB_PRESETS[0].id);
  const [qidoRoot, setQidoRoot] = useState(OHIF_DICOMWEB_PRESETS[0].qidoRoot);
  const [studies, setStudies] = useState<DicomWebStudySummary[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    imagingService
      .getOhifStatus()
      .then((res) => setOhifInfo(res as OhifApiStatus))
      .catch(() => {});
  }, []);

  const handlePresetChange = (id: string) => {
    setSelectedPresetId(id);
    const preset = OHIF_DICOMWEB_PRESETS.find((p) => p.id === id);
    if (preset) {
      setQidoRoot(preset.qidoRoot);
      setQueryError(null);
    }
  };

  const handleQueryStudies = async () => {
    sounds.playClick();
    setIsQuerying(true);
    setQueryError(null);
    try {
      const list = await queryOhifDicomWebStudies(qidoRoot, 10);
      setStudies(list);
      if (list.length === 0) {
        setQueryError("DICOMweb endpoint responded cleanly with 0 studies.");
      }
    } catch (err) {
      setQueryError(
        err instanceof Error
          ? `${err.message}. Verify CORS headers or local PACS server availability.`
          : "Could not reach QIDO-RS endpoint."
      );
      setStudies([]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-amber-500/10 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
              OHIF Viewers Integration
            </span>
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
              {ohifInfo?.localPath || "external/ohif"} • v{ohifInfo?.version || "3.14.0-beta.44"}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50">
            Open Health Imaging Foundation (OHIF) Workstation & DICOMweb Hub
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Powered by upstream OHIF <code className="font-mono">dicom-parser</code> (v{ohifInfo?.embeddedPackages?.dicomParser || "1.8.21"}) and{" "}
            <code className="font-mono">dcmjs</code> (v{ohifInfo?.embeddedPackages?.dcmjs || "0.52.0"}). Launch calibrated OHIF hanging protocols directly or query QIDO-RS DICOMweb archives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenLocalSeriesUpload}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm transition-colors"
          >
            Load Local DICOM Series (.dcm)
          </button>
          <a
            href="https://github.com/OHIF/Viewers"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <FolderGit2 size={14} />
            <span>OHIF/Viewers</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Hanging Protocols Grid */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              OHIF Hanging Protocols (1×1 & 2×2 Quad MPR)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">Instant Patient Volume Binding</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {OHIF_HANGING_PROTOCOLS.map((proto) => (
            <button
              key={proto.id}
              type="button"
              onClick={() => onOpenMprWithProtocol(proto.id)}
              className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/60 hover:border-cyan-500/60 text-left space-y-2 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-cyan-500 transition-colors">
                  {proto.name}
                </span>
                <ArrowUpRight size={14} className="text-neutral-400 group-hover:text-cyan-500" />
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {proto.description}
              </p>
              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                W: {proto.windowWidth} / L: {proto.windowCenter} • {proto.layout.toUpperCase()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* DICOMweb QIDO-RS Study Browser */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                DICOMweb (QIDO-RS) Archive Query
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Connect directly to StaticWado, Orthanc, dcm4chee, or OHIF&apos;s public AWS S3 DICOMweb endpoint.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {OHIF_DICOMWEB_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetChange(preset.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors ${
                  selectedPresetId === preset.id
                    ? "bg-amber-500 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={qidoRoot}
            onChange={(e) => setQidoRoot(e.target.value)}
            placeholder="https://.../dicomweb"
            className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-neutral-100 outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={handleQueryStudies}
            disabled={isQuerying || !qidoRoot.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2c2623] hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw size={13} className={isQuerying ? "animate-spin" : ""} />
            <span>{isQuerying ? "Querying QIDO-RS..." : "Query Studies"}</span>
          </button>
        </div>

        {queryError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
            {queryError}
          </div>
        )}

        {studies.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 dark:bg-neutral-950 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Study Description</th>
                  <th className="px-3 py-2">Modality</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Study UID</th>
                  <th className="px-3 py-2 text-right">Instances</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11px]">
                {studies.map((s) => (
                  <tr key={s.studyInstanceUid} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="px-3 py-2 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                      {s.studyDescription}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold">
                        {s.modalitiesInStudy}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{s.studyDate}</td>
                    <td className="px-3 py-2 text-neutral-500 max-w-[220px] truncate">{s.studyInstanceUid}</td>
                    <td className="px-3 py-2 text-right font-bold">{s.numInstances || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submodule Runtime & Modes Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
            <Server size={15} className="text-emerald-500" />
            <span>Registered OHIF Monorepo Modes ({ohifInfo?.supportedModes?.length || 7})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(ohifInfo?.supportedModes || ["basic", "longitudinal", "segmentation", "tmtv", "preclinical-4d", "microscopy", "usAnnotation"]).map(
              (mode) => (
                <span
                  key={mode}
                  className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px] text-neutral-700 dark:text-neutral-300"
                >
                  @ohif/mode-{mode}
                </span>
              )
            )}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
            <span>License: {ohifInfo?.license || "MIT License (Open Health Imaging Foundation)"}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
            <Terminal size={15} className="text-amber-500" />
            <span>Standalone OHIF Companion Server</span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Anatomy Atelier embeds <code className="font-mono">dicom-parser</code>, <code className="font-mono">dcmjs</code>, 2×2 Quad MPR, and TID-1500 SR export natively. To also launch the full monorepo app alongside port 3000:
          </p>
          <div className="p-2.5 rounded-xl bg-neutral-950 text-cyan-300 font-mono text-[11px] overflow-x-auto">
            pnpm --dir external/ohif install &amp;&amp; npm run ohif:dev
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <Activity size={13} className="text-cyan-500" />
            <span>Companion default endpoint: http://localhost:3001</span>
          </div>
        </div>
      </div>
    </div>
  );
}

