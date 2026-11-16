"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Focus,
  Ghost,
  Info,
  Layers3,
  Maximize2,
  Microscope,
  Minimize2,
  RotateCcw,
  Scissors,
  Search,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  BODY_ATLAS_LAYERS,
  BODY_ATLAS_SYSTEMS,
  loadBodyAtlasParts,
  mapBodyAtlasPartToOrganId,
  type BodyAtlasPart,
} from "@/lib/anatomy/body-atlas";
import type { OrganId } from "@/app/lib/anatomy-data";
import type { Language } from "./i18n";

export type AtlasEditionChoice = "male" | "female" | "z-anatomy" | "body-atlas";

export interface LayeredBodyAtlasViewProps {
  theme: "light" | "dark";
  language: Language;
  onSelectEdition: (choice: AtlasEditionChoice) => void;
  onOpenInAtelier?: (organId: OrganId) => void;
  onSwitchToAtelier?: () => void;
}

interface AtlasIframeApi {
  ready: boolean;
  setDepth: (v: number) => void;
  getDepth: () => number;
  setSystem: (id: string, on: boolean) => boolean;
  setSex: (sex: "male" | "female") => void;
  getSex: () => "male" | "female";
  select: (id: string | null) => string | null;
  getSelected: () => string | null;
  focus: (target: string | "all") => boolean;
  setView: (view: "front" | "back" | "left" | "right" | "top" | "bottom" | "iso") => void;
  setCut: (axis: "x" | "y" | "z" | "off", position01?: number, flip?: boolean) => void;
  setGhost: (on: boolean) => boolean;
  setLabels: (on: boolean) => boolean;
  hide: (id: string) => boolean;
  unhide: (id: string) => boolean;
  isolate: (id: string) => boolean;
  showAll: () => boolean;
  setSkinTone: (i: number) => number;
  reset: () => void;
  parts: () => unknown[];
  stats: () => { fps?: number; calls?: number; triangles?: number };
}

export function LayeredBodyAtlasView({
  theme,
  language,
  onSelectEdition,
  onOpenInAtelier,
  onSwitchToAtelier,
}: LayeredBodyAtlasViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [sex, setSex] = useState<"male" | "female">("male");
  const [depth, setDepth] = useState<number>(1);
  const [ghost, setGhost] = useState(false);
  const [labels, setLabels] = useState(false);
  const [cutActive, setCutActive] = useState(false);
  const [cutAxis, setCutAxis] = useState<"x" | "y" | "z">("x");
  const [cutPos, setCutPos] = useState<number>(0.5);
  const [cutFlip, setCutFlip] = useState(false);

  const [activeSystems, setActiveSystems] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    BODY_ATLAS_SYSTEMS.forEach((s) => {
      map[s.id] = true;
    });
    return map;
  });

  const [parts, setParts] = useState<BodyAtlasPart[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedPart = useMemo(() => {
    if (!selectedId || parts.length === 0) return null;
    return parts.find((p) => p.id === selectedId) || null;
  }, [selectedId, parts]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"layers" | "systems">("layers");

  // Load parts metadata catalog
  useEffect(() => {
    loadBodyAtlasParts().then((loaded) => {
      setParts(loaded);
    });
  }, []);

  const getAtlasApi = useCallback((): AtlasIframeApi | null => {
    try {
      const win = iframeRef.current?.contentWindow as (Window & { ATLAS?: AtlasIframeApi }) | null;
      return win?.ATLAS || null;
    } catch {
      return null;
    }
  }, []);

  // Listen to postMessage from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "atlas-select") {
        const id = (e.data.id as string | null) || null;
        setSelectedId(id);
        if (id) {
          setDetailsOpen(true);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSetDepth = (newDepth: number) => {
    setDepth(newDepth);
    const api = getAtlasApi();
    if (api) api.setDepth(newDepth);
  };

  const handleSetSex = (newSex: "male" | "female") => {
    setSex(newSex);
    const api = getAtlasApi();
    if (api) api.setSex(newSex);
  };

  const handleToggleGhost = () => {
    const next = !ghost;
    setGhost(next);
    const api = getAtlasApi();
    if (api) api.setGhost(next);
  };

  const handleToggleLabels = () => {
    const next = !labels;
    setLabels(next);
    const api = getAtlasApi();
    if (api) api.setLabels(next);
  };

  const handleSetView = (view: "front" | "back" | "left" | "right" | "top" | "bottom" | "iso") => {
    const api = getAtlasApi();
    if (api) api.setView(view);
  };

  const handleToggleCut = () => {
    const next = !cutActive;
    setCutActive(next);
    const api = getAtlasApi();
    if (api) {
      if (next) {
        api.setCut(cutAxis, cutPos, cutFlip);
      } else {
        api.setCut("off");
      }
    }
  };

  const handleUpdateCutAxis = (axis: "x" | "y" | "z") => {
    setCutAxis(axis);
    const api = getAtlasApi();
    if (api && cutActive) {
      api.setCut(axis, cutPos, cutFlip);
    }
  };

  const handleUpdateCutPos = (val: number) => {
    setCutPos(val);
    const api = getAtlasApi();
    if (api && cutActive) {
      api.setCut(cutAxis, val, cutFlip);
    }
  };

  const handleUpdateCutFlip = (flip: boolean) => {
    setCutFlip(flip);
    const api = getAtlasApi();
    if (api && cutActive) {
      api.setCut(cutAxis, cutPos, flip);
    }
  };

  const handleToggleSystem = (sysId: string) => {
    const next = !activeSystems[sysId];
    setActiveSystems((prev) => ({ ...prev, [sysId]: next }));
    const api = getAtlasApi();
    if (api) api.setSystem(sysId, next);
  };

  const handleSelectPart = (part: BodyAtlasPart) => {
    setSelectedId(part.id);
    setDetailsOpen(true);
    setSearchOpen(false);
    const api = getAtlasApi();
    if (api) {
      api.select(part.id);
      api.focus(part.id);
    }
  };

  const handleFocusSelected = () => {
    if (!selectedId) return;
    const api = getAtlasApi();
    if (api) api.focus(selectedId);
  };

  const handleIsolateSelected = () => {
    if (!selectedId) return;
    const api = getAtlasApi();
    if (api) api.isolate(selectedId);
  };

  const handleHideSelected = () => {
    if (!selectedId) return;
    const api = getAtlasApi();
    if (api) api.hide(selectedId);
  };

  const handleShowAll = () => {
    const api = getAtlasApi();
    if (api) api.showAll();
  };

  const handleReset = () => {
    setDepth(1);
    setGhost(false);
    setLabels(false);
    setCutActive(false);
    setSelectedId(null);
    setDetailsOpen(false);
    const allOn: Record<string, boolean> = {};
    BODY_ATLAS_SYSTEMS.forEach((s) => {
      allOn[s.id] = true;
    });
    setActiveSystems(allOn);
    const api = getAtlasApi();
    if (api) api.reset();
  };

  // Search filter
  const filteredParts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return parts
      .filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.latin.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.systemName.toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [parts, searchQuery]);

  const currentLayerName = useMemo(() => {
    const rounded = Math.min(10, Math.max(1, Math.round(depth)));
    const found = BODY_ATLAS_LAYERS.find((l) => l.layer === rounded);
    return found ? `${found.layer}. ${found.name}` : `Layer ${rounded}`;
  }, [depth]);

  const mappedOrgan = selectedPart ? mapBodyAtlasPartToOrganId(selectedPart) : null;

  return (
    <div
      data-theme={theme}
      lang={language}
      className={`relative w-full h-full flex flex-col overflow-hidden select-none ${
        fullscreen ? "fixed inset-0 z-50 bg-slate-950 text-white" : ""
      }`}
    >
      {/* Top Application Ribbon */}
      <header className="h-13 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 sm:px-4 flex items-center justify-between gap-2 z-20 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Edition Switcher Dropdown */}
          <div className="flex items-center bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => onSelectEdition("male")}
              className="px-2.5 py-1 text-xs font-semibold rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Standard Atlas
            </button>
            <button
              type="button"
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Layered Atlas (1,310)</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectEdition("z-anatomy")}
              className="px-2.5 py-1 text-xs font-semibold rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Z-Anatomy (2,827)
            </button>
          </div>

          {/* Sex Switcher */}
          <div className="flex items-center bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700 ml-1">
            <button
              type="button"
              onClick={() => handleSetSex("male")}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                sex === "male"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => handleSetSex("female")}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                sex === "female"
                  ? "bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-400 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              Female
            </button>
          </div>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {/* Camera Viewpoints */}
          <div className="hidden lg:flex items-center bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => handleSetView("front")}
              className="px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-slate-700 rounded-sm"
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => handleSetView("back")}
              className="px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-slate-700 rounded-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => handleSetView("left")}
              className="px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-slate-700 rounded-sm"
            >
              Left
            </button>
            <button
              type="button"
              onClick={() => handleSetView("right")}
              className="px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-slate-700 rounded-sm"
            >
              Right
            </button>
            <button
              type="button"
              onClick={() => handleSetView("iso")}
              className="px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-slate-700 rounded-sm"
            >
              3/4
            </button>
          </div>

          {/* Ghost Mode */}
          <Button
            size="sm"
            variant={ghost ? "secondary" : "outline"}
            className={`h-8 text-xs gap-1.5 ${ghost ? "border-purple-500 text-purple-600 dark:text-purple-400" : ""}`}
            onClick={handleToggleGhost}
            title="Ghost peeled layers as translucent shells"
          >
            <Ghost className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ghost</span>
          </Button>

          {/* Labels Mode */}
          <Button
            size="sm"
            variant={labels ? "secondary" : "outline"}
            className={`h-8 text-xs gap-1.5 ${labels ? "border-purple-500 text-purple-600 dark:text-purple-400" : ""}`}
            onClick={handleToggleLabels}
            title="Toggle 3D spatial labels"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Labels</span>
          </Button>

          {/* Cross-Section Cutting Tool */}
          <Button
            size="sm"
            variant={cutActive ? "secondary" : "outline"}
            className={`h-8 text-xs gap-1.5 ${cutActive ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold" : ""}`}
            onClick={handleToggleCut}
            title="Cross-section multiplanar clipping plane"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Cut</span>
          </Button>

          {/* Search Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search (1,310)</span>
          </Button>

          {/* Reset */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={handleReset}
            title="Reset scene camera & dissection"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          {/* Organ Atelier Switch */}
          {onSwitchToAtelier && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 hidden xl:flex text-neutral-700 dark:text-neutral-300"
              onClick={onSwitchToAtelier}
              title="Switch to Organ Atelier"
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>Organ Atelier</span>
            </Button>
          )}

          {/* Fullscreen */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setFullscreen((f) => !f)}
            title="Toggle Fullscreen"
          >
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </header>

      {/* Cross-Section Cut Controls Bar (Conditional) */}
      {cutActive && (
        <div className="h-10 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 flex items-center justify-between text-xs z-10 flex-shrink-0 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-600" />
              Slicing Axis:
            </span>
            <div className="flex items-center bg-white dark:bg-slate-800 rounded border border-amber-200 dark:border-amber-800 p-0.5">
              <button
                type="button"
                onClick={() => handleUpdateCutAxis("x")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  cutAxis === "x" ? "bg-amber-500 text-white" : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                X (Sagittal)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateCutAxis("y")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  cutAxis === "y" ? "bg-amber-500 text-white" : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                Y (Axial)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateCutAxis("z")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  cutAxis === "z" ? "bg-amber-500 text-white" : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                Z (Coronal)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-xs mx-4">
            <span className="text-[11px] text-amber-800 dark:text-amber-300 whitespace-nowrap">Plane Position</span>
            <Slider
              value={[cutPos]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(val) => {
                const num = Array.isArray(val) ? val[0] : typeof val === "number" ? val : cutPos;
                handleUpdateCutPos(num);
              }}
              className="w-full"
            />
            <span className="text-[11px] font-mono text-amber-900 dark:text-amber-200 w-8 text-right">
              {Math.round(cutPos * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={cutFlip}
                onChange={(e) => handleUpdateCutFlip(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              Invert Cut
            </label>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-200/50"
              onClick={() => handleToggleCut()}
            >
              Off
            </Button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Floating Rail (Dissection & System Layers) */}
        <aside className="w-64 sm:w-72 border-r border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col z-10 flex-shrink-0">
          <div className="flex border-b border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab("layers")}
              className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "layers"
                  ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <Layers3 className="w-3.5 h-3.5" />
              <span>Dissection Peel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("systems")}
              className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "systems"
                  ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Systems (12)</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "layers" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Dissection Depth
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {depth.toFixed(2)} / 10
                    </Badge>
                  </div>
                  <Slider
                    value={[depth]}
                    min={1}
                    max={10}
                    step={0.1}
                    onValueChange={(val) => {
                    const num = Array.isArray(val) ? val[0] : typeof val === "number" ? val : depth;
                    handleSetDepth(num);
                  }}
                    className="my-3"
                  />
                  <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-slate-800 text-xs space-y-1">
                    <div className="font-semibold text-purple-600 dark:text-purple-400">
                      {currentLayerName}
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">
                      Peeling reveals deep anatomical strata layer-by-layer while preserving spatial landmark
                      relationships.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
                    Anatomical Strata
                  </span>
                  {BODY_ATLAS_LAYERS.map((layer) => {
                    const isVisible = depth >= layer.layer;
                    return (
                      <button
                        key={layer.layer}
                        type="button"
                        onClick={() => handleSetDepth(layer.layer)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                          Math.round(depth) === layer.layer
                            ? "bg-purple-100 dark:bg-purple-950/60 font-semibold text-purple-700 dark:text-purple-300"
                            : isVisible
                            ? "text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-slate-800"
                            : "text-neutral-400 dark:text-neutral-600 hover:bg-neutral-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isVisible ? "bg-purple-500" : "bg-neutral-300 dark:bg-neutral-700"
                            }`}
                          />
                          <span>
                            {layer.layer}. {layer.name}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] text-neutral-400">
                          {layer.partCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Anatomical Systems
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allVisible = Object.values(activeSystems).every(Boolean);
                      const updated: Record<string, boolean> = {};
                      BODY_ATLAS_SYSTEMS.forEach((s) => {
                        updated[s.id] = !allVisible;
                        const api = getAtlasApi();
                        if (api) api.setSystem(s.id, !allVisible);
                      });
                      setActiveSystems(updated);
                    }}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Toggle All
                  </button>
                </div>
                {BODY_ATLAS_SYSTEMS.map((system) => {
                  const on = activeSystems[system.id] ?? true;
                  return (
                    <div
                      key={system.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => handleToggleSystem(system.id)}
                          className="rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: system.color }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                            {system.name}
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {system.partCount} structures
                          </span>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-neutral-500">
            <span>1,310 Procedural Parts</span>
            <span className="font-mono text-[11px]">Three.js r160</span>
          </div>
        </aside>

        {/* Center 3D Atlas Frame */}
        <div className="relative flex-1 h-full bg-slate-950">
          <iframe
            ref={iframeRef}
            src="/body-atlas/index.html"
            title="Layered Body Atlas 3D Viewer"
            className="w-full h-full border-0"
            allow="accelerometer; gyroscope"
          />

          {/* Floating Action Trigger for Selection */}
          {selectedPart && !detailsOpen && (
            <div className="absolute bottom-4 right-4 z-20">
              <Button
                size="sm"
                onClick={() => setDetailsOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg text-xs gap-1.5"
              >
                <Info className="w-3.5 h-3.5" />
                <span>View {selectedPart.name}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Structure Details Drawer (Sheet) */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6 space-y-5">
          {selectedPart ? (
            <>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    style={{ backgroundColor: selectedPart.systemColor }}
                    className="text-white text-[11px] font-semibold"
                  >
                    {selectedPart.systemName}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    Layer {selectedPart.layer}: {selectedPart.layerName}
                  </Badge>
                </div>
                <SheetTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {selectedPart.name}
                </SheetTitle>
                <SheetDescription className="text-sm italic font-serif text-purple-600 dark:text-purple-400 mt-0.5">
                  {selectedPart.latin || "Terminologia Anatomica"}
                </SheetDescription>
              </div>

              {/* Action Toolbar */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleFocusSelected}>
                  <Focus className="w-3 h-3 mr-1" />
                  Focus
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleIsolateSelected}>
                  <Eye className="w-3 h-3 mr-1" />
                  Isolate
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleHideSelected}>
                  <EyeOff className="w-3 h-3 mr-1" />
                  Hide
                </Button>
                <Button size="sm" variant="secondary" className="text-xs h-8" onClick={handleShowAll}>
                  Show All
                </Button>
              </div>

              {/* Mapped Organ Atelier Deep-Link */}
              {mappedOrgan && onOpenInAtelier && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                      Organ Dissection Available
                    </div>
                    <div className="text-[11px] text-purple-700 dark:text-purple-300">
                      Explore detailed layers and histology in Organ Atelier.
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onOpenInAtelier(mappedOrgan)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 gap-1"
                  >
                    <span>Open</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Anatomical Dimensions & Coordinates */}
              <div className="space-y-3">
                <div className="bg-neutral-50 dark:bg-slate-800/60 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Anatomical Region</span>
                    <span className="font-semibold capitalize text-neutral-800 dark:text-neutral-200">
                      {selectedPart.region}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Symmetry Side</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedPart.side === "L" ? "Left" : selectedPart.side === "R" ? "Right" : "Midline"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">3D Spatial Centroid</span>
                    <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                      [{selectedPart.center.join(", ")}]
                    </span>
                  </div>
                  {selectedPart.info.size && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                      <span className="text-neutral-500 dark:text-neutral-400">Size / Metric</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 text-right max-w-[200px]">
                        {selectedPart.info.size}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedPart.info.description && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Anatomical Description
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {selectedPart.info.description}
                    </p>
                  </div>
                )}

                {/* Function */}
                {selectedPart.info.function && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Physiological Function
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {selectedPart.info.function}
                    </p>
                  </div>
                )}

                {/* Clinical Notes */}
                {selectedPart.info.notes && (
                  <div className="space-y-1 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Clinical Pearls &amp; Pathology
                    </div>
                    <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                      {selectedPart.info.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-neutral-400">
              <Crosshair className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Click or hover any structure in the 3D viewport to inspect.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across 1,310 parts (e.g. Femur, Ventricle, Aorta, Radial nerve)..."
                autoFocus
                className="flex-1 bg-transparent border-0 text-sm focus:outline-hidden text-neutral-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredParts.length > 0 ? (
                filteredParts.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelectPart(part)}
                    className="w-full p-3 text-left hover:bg-neutral-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {part.name}
                      </div>
                      <div className="text-[11px] italic text-neutral-500 dark:text-neutral-400">
                        {part.latin || part.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        style={{ color: part.systemColor }}
                        className="text-[10px]"
                      >
                        {part.systemName}
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))
              ) : searchQuery ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No structures matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="p-4 text-xs text-neutral-500 dark:text-neutral-400">
                  Type an English name, Latin anatomical term, or organ system to jump directly to any of the 1,310
                  structures in 3D.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
