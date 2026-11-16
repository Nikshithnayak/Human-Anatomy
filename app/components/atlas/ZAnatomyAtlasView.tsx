"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  Focus,
  Ghost,
  Info,
  Layers3,
  Maximize2,
  Microscope,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import ZAnatomyScene from "./ZAnatomyScene";
import {
  Z_ANATOMY_PRESETS,
  Z_ANATOMY_SYSTEMS,
  buildZAnatomyPartsData,
  loadZAnatomyDefinitionsJson,
  loadZAnatomyLexiconJson,
  loadZAnatomySystemsJson,
  parseZAnatomyDefinition,
  type ZAnatomyContainment,
  type ZAnatomyPart,
  type ZAnatomyPreset,
  type ZAnatomySystemId,
} from "@/lib/anatomy/z-anatomy";
import { getAnatomicalRelationships } from "@/lib/anatomy/relationships";
import type { OrganId } from "../../lib/anatomy-data";
import { EDITIONS, edition_, type Sex } from "./anatomy";
import { say, type Language } from "./i18n";

export type AtlasEditionChoice = Sex | "z-anatomy";

const ORGAN_KEYWORDS: { pattern: RegExp; organId: OrganId; name: string }[] = [
  { pattern: /\b(heart|cardiac|myocardium|ventricle|atrium|aorta|mitral|tricuspid|pericardium|coronary)\b/i, organId: "heart", name: "Heart" },
  { pattern: /\b(brain|cerebr|cerebell|cortex|hippocampus|thalamus|encephalon|medulla|pons|meninges)\b/i, organId: "brain", name: "Brain" },
  { pattern: /\b(kidney|renal|nephron|ureter|suprarenal|adrenal)\b/i, organId: "kidneys", name: "Kidneys" },
  { pattern: /\b(liver|hepatic|bile|gallbladder|portal)\b/i, organId: "liver", name: "Liver" },
  { pattern: /\b(lung|pulmonary|bronch|trachea|pleura)\b/i, organId: "lungs", name: "Lungs" },
  { pattern: /\b(pancreas|pancreat|duodenum)\b/i, organId: "pancreas", name: "Pancreas" },
  { pattern: /\b(eye|eyeball|cornea|retina|iris|sclera|lens|optic)\b/i, organId: "eyeball", name: "Eyeball" },
  { pattern: /\b(intestine|colon|bowel|ileum|jejunum|stomach|gastric|caecum|rectum|esophagus)\b/i, organId: "intestine", name: "Intestine" },
];

export interface ZAnatomyAtlasViewProps {
  theme: "light" | "dark";
  language: Language;
  onSelectEdition: (choice: AtlasEditionChoice) => void;
  onOpenInAtelier?: (organId: OrganId) => void;
  onSwitchToAtelier?: () => void;
}

export function ZAnatomyAtlasView({
  theme,
  language,
  onSelectEdition,
  onOpenInAtelier,
  onSwitchToAtelier,
}: ZAnatomyAtlasViewProps) {
  const t = (phrase: Parameters<typeof say>[1]) => say(language, phrase);

  const [fullscreen, setFullscreen] = useState(false);
  const [activeSystems, setActiveSystems] = useState<ZAnatomySystemId[]>(["skeletal"]);
  const [loadedSystems, setLoadedSystems] = useState<ZAnatomySystemId[]>([]);
  const [partsMap, setPartsMap] = useState<Record<string, ZAnatomyPart>>({});
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [containment, setContainment] = useState<Record<string, ZAnatomyContainment>>({});

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{ partId: string; x: number; y: number } | null>(null);

  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const [ghostOthers, setGhostOthers] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [opacities, setOpacities] = useState<Record<string, number>>({});
  const [depthPercent, setDepthPercent] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);

  const [panel, setPanel] = useState<"layers" | "search" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loadStatus, setLoadStatus] = useState<{ systemId: ZAnatomySystemId | null; progress: number; message: string }>({
    systemId: "skeletal",
    progress: 0,
    message: "Loading Z-Anatomy catalog (2,827 structures)...",
  });
  const [error, setError] = useState("");
  const [cameraCommand, setCameraCommand] = useState<
    | { type: "view"; view: "front" | "back" | "left" | "right" | "top"; seq: number }
    | { type: "preset"; preset: ZAnatomyPreset; seq: number }
    | { type: "focus"; partId: string; seq: number }
    | { type: "reset"; seq: number }
    | null
  >(null);

  // Fetch Z-Anatomy JSON catalog + Latin lexicon + definitions in parallel
  useEffect(() => {
    let active = true;
    Promise.all([loadZAnatomySystemsJson(), loadZAnatomyLexiconJson()])
      .then(([systemsJson, lexiconJson]) => {
        if (!active) return;
        setPartsMap(buildZAnatomyPartsData(systemsJson, lexiconJson));
        loadZAnatomyDefinitionsJson().then((defs) => {
          if (active) setDefinitions(defs);
        });
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed loading Z-Anatomy metadata");
      });

    return () => {
      active = false;
    };
  }, []);

  // Support `/` search hotkey consistent with HumanAtlasViewer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setPanel("search");
        setDetailsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allPartsList = useMemo(() => Object.values(partsMap), [partsMap]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const priority = ["Femur.l", "Cranium", "Heart", "Aorta", "Mandible", "Brachial plexus.l", "Liver", "Sternum"];
      const initial = priority.map((id) => partsMap[id]).filter((p): p is ZAnatomyPart => !!p);
      return initial.length > 0 ? initial : allPartsList.slice(0, 12);
    }
    return allPartsList
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.latinName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 80);
  }, [allPartsList, partsMap, query]);

  // Complete pending focus/select once target system loads
  useEffect(() => {
    if (!pendingSelectId) return;
    if (containment[pendingSelectId]) {
      const targetId = pendingSelectId;
      const timer = setTimeout(() => {
        setSelectedId(targetId);
        setDetailsOpen(true);
        setCameraCommand((c) => ({ type: "focus", partId: targetId, seq: (c?.seq ?? 0) + 1 }));
        setPendingSelectId(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pendingSelectId, containment]);

  const selectStructure = useCallback(
    (partId: string | null) => {
      if (!partId) {
        setSelectedId(null);
        setDetailsOpen(false);
        return;
      }
      const part = partsMap[partId];
      if (part && !activeSystems.includes(part.system)) {
        setActiveSystems((prev) => [...prev, part.system]);
        setPendingSelectId(partId);
        return;
      }
      setSelectedId(partId);
      setDetailsOpen(true);
      setPanel(null);
      if (containment[partId]) {
        setCameraCommand((c) => ({ type: "focus", partId, seq: (c?.seq ?? 0) + 1 }));
      } else {
        setPendingSelectId(partId);
      }
    },
    [partsMap, activeSystems, containment]
  );

  const toggleSystem = (sysId: ZAnatomySystemId) => {
    setDepthPercent(0);
    setActiveSystems((prev) => {
      if (prev.includes(sysId)) {
        return prev.length > 1 ? prev.filter((id) => id !== sysId) : prev;
      }
      return [...prev, sysId];
    });
  };

  const loadAllSystems = () => {
    setDepthPercent(0);
    setActiveSystems(Z_ANATOMY_SYSTEMS.map((s) => s.id));
  };

  const applyPreset = (preset: ZAnatomyPreset) => {
    setDepthPercent(0);
    setIsolatedId(null);
    setHiddenIds([]);
    setSelectedId(null);
    setDetailsOpen(false);
    setActiveSystems(preset.systems);
    setCameraCommand((c) => ({ type: "preset", preset, seq: (c?.seq ?? 0) + 1 }));
  };

  const resetView = () => {
    setDepthPercent(0);
    setIsolatedId(null);
    setHiddenIds([]);
    setOpacities({});
    setSelectedId(null);
    setDetailsOpen(false);
    setAutoRotate(false);
    setActiveSystems(["skeletal"]);
    setCameraCommand((c) => ({ type: "reset", seq: (c?.seq ?? 0) + 1 }));
  };

  const selectedPart = selectedId ? partsMap[selectedId] : null;
  const selectedContainment = selectedId ? containment[selectedId] : undefined;
  const selectedDef = useMemo(() => {
    if (!selectedPart) return { text: "", url: null };
    return parseZAnatomyDefinition(definitions[selectedPart.baseName] || definitions[selectedPart.id]);
  }, [selectedPart, definitions]);

  const selectedSystemMeta = selectedPart
    ? Z_ANATOMY_SYSTEMS.find((s) => s.id === selectedPart.system)
    : null;

  const matchedOrgan = useMemo(() => {
    if (!selectedPart) return null;
    for (const item of ORGAN_KEYWORDS) {
      if (item.pattern.test(selectedPart.name)) return item;
    }
    return null;
  }, [selectedPart]);

  const relationships = useMemo(() => {
    if (!selectedPart) return [];
    return getAnatomicalRelationships(selectedPart.baseName)?.relationships ?? [];
  }, [selectedPart]);

  const hoveredPart = hoveredInfo ? partsMap[hoveredInfo.partId] : null;

  const totalLoadedCount = useMemo(
    () =>
      allPartsList.filter((p) => loadedSystems.includes(p.system) && activeSystems.includes(p.system) && !hiddenIds.includes(p.id))
        .length,
    [allPartsList, loadedSystems, activeSystems, hiddenIds]
  );

  return (
    <div
      className={`studio studio-${theme} ${fullscreen ? "studio-fullscreen" : ""}`}
      lang={language}
    >
      <ZAnatomyScene
        theme={theme}
        activeSystems={activeSystems}
        selectedId={selectedId}
        isolatedId={isolatedId}
        ghostOthers={ghostOthers}
        hiddenIds={hiddenIds}
        opacities={opacities}
        depthPercent={depthPercent}
        autoRotate={autoRotate}
        cameraCommand={cameraCommand}
        onSelect={selectStructure}
        onHover={(partId, pos) => {
          if (partId && pos) setHoveredInfo({ partId, x: pos.x, y: pos.y });
          else setHoveredInfo(null);
        }}
        onLoadedSystemsChange={setLoadedSystems}
        onLoadingProgress={setLoadStatus}
        onRegistryUpdate={setContainment}
        onError={setError}
      />
      <div className="vignette" />

      {/* Hover Structure Callout */}
      {hoveredPart && hoveredInfo && (
        <div
          className="fixed z-40 pointer-events-none px-2.5 py-1.5 rounded-xl bg-neutral-950/90 text-white border border-amber-500/40 shadow-lg text-xs backdrop-blur-md"
          style={{
            left: Math.min(hoveredInfo.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240),
            top: Math.max(hoveredInfo.y - 36, 56),
          }}
        >
          <div className="font-bold text-amber-300 leading-tight">{hoveredPart.name}</div>
          {hoveredPart.latinName && (
            <div className="text-[10px] italic text-neutral-300">{hoveredPart.latinName}</div>
          )}
        </div>
      )}

      {/* Top Left Identity & Edition Switcher */}
      <header className="identity">
        <div className="eyebrow">
          <span className="status-dot" /> Z-ANATOMY · 3D ATLAS
        </div>
        <h1>
          {t("title")}
          <Badge variant="outline" className="edition">
            2,827
          </Badge>
        </h1>
        <div className="identity-meta">
          {totalLoadedCount.toLocaleString("en")} / {allPartsList.length.toLocaleString("en")} active <span>·</span>{" "}
          {loadedSystems.length} / {Z_ANATOMY_SYSTEMS.length} systems
        </div>
        <div className="anatomy-choice" role="group" aria-label={t("referenceBodyLabel")}>
          <div className="edition-pills">
            {EDITIONS.map((e) => (
              <button
                key={e.sex}
                type="button"
                className="edition-pill"
                aria-pressed={false}
                onClick={() => onSelectEdition(e.sex)}
              >
                {edition_(e.sex, language).label}
              </button>
            ))}
            <button
              type="button"
              className="edition-pill active"
              aria-pressed={true}
              onClick={() => onSelectEdition("z-anatomy")}
            >
              Z-Anatomy · 2,827
            </button>
          </div>
        </div>
      </header>

      {/* Top Right Actions */}
      <nav className="top-actions" aria-label={t("explorerPanels")}>
        {onSwitchToAtelier && (
          <button
            type="button"
            className="flex items-center gap-2 font-medium"
            onClick={onSwitchToAtelier}
            title={t("switchToAtelier")}
          >
            <Microscope size={17} />
            <span>{t("organAtelier")}</span>
          </button>
        )}
        <Button
          variant="ghost"
          className={panel === "search" ? "active" : ""}
          onClick={() => {
            setDetailsOpen(false);
            setPanel((p) => (p === "search" ? null : "search"));
          }}
          aria-label="Search 2,827 Structures"
        >
          <Search size={18} />
          <span>{t("findStructure")}</span>
          <kbd>/</kbd>
        </Button>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
          onClick={() => setFullscreen(!fullscreen)}
        >
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </Button>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label="About Z-Anatomy License & Attribution"
          onClick={() => {
            setDetailsOpen(false);
            setPanel(null);
            setAboutOpen(true);
          }}
        >
          <Info size={18} />
        </Button>
      </nav>

      {/* Left Systems & Presets Panel */}
      <section className={`layers-panel glass ${panel === "layers" ? "mobile-open" : ""}`} aria-label="Z-Anatomy Systems">
        <div className="panel-heading">
          <span>Systems (7)</span>
          <Button
            variant="ghost"
            className="mobile-only icon-button"
            onClick={() => setPanel(null)}
            aria-label="Close Systems"
          >
            <X size={18} />
          </Button>
          <Badge variant="secondary" className="desktop-only small-number">
            {activeSystems.length}/{Z_ANATOMY_SYSTEMS.length}
          </Badge>
        </div>

        <div className="layer-presets">
          <Button variant="ghost" onClick={loadAllSystems}>
            <Sparkles size={13} />
            All 7 Systems
          </Button>
          {hiddenIds.length > 0 && (
            <Button variant="ghost" onClick={() => setHiddenIds([])}>
              Show {hiddenIds.length} Hidden
            </Button>
          )}
        </div>

        <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[300px]">
          {Z_ANATOMY_SYSTEMS.map((sys) => {
            const isActive = activeSystems.includes(sys.id);
            const isLoaded = loadedSystems.includes(sys.id);
            return (
              <button
                key={sys.id}
                type="button"
                onClick={() => toggleSystem(sys.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-all border ${isActive
                  ? "border-amber-500/50 bg-amber-500/15 font-semibold"
                  : "border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-75"
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sys.color }} />
                  <span className="truncate">{sys.name}</span>
                </div>
                <span className="text-[10px] font-mono opacity-75 shrink-0">
                  {sys.structureCount} {isLoaded ? "✓" : `· ${sys.sizeLabel}`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">Quick Study Presets</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Z_ANATOMY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                title={preset.description}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-black/5 dark:bg-white/5 hover:bg-amber-500/20 border border-black/10 dark:border-white/10 transition-colors truncate"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Search Overlay */}
      {panel === "search" && (
        <aside className="search-panel glass" aria-label="Search Z-Anatomy structures">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2 flex-1">
              <Search size={16} className="opacity-60" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 2,827 English or Latin TA terms (e.g. Femur, Aorta, Median)..."
                className="w-full bg-transparent outline-none text-xs sm:text-sm"
              />
            </div>
            <Button variant="ghost" className="icon-button" onClick={() => setPanel(null)} aria-label="Close Search">
              <X size={16} />
            </Button>
          </div>
          <div className="mt-2 max-h-[320px] overflow-y-auto space-y-1 pr-1">
            {searchResults.length === 0 ? (
              <p className="text-xs opacity-65 py-6 text-center">No matching structure found in Z-Anatomy.</p>
            ) : (
              searchResults.map((p) => {
                const sys = Z_ANATOMY_SYSTEMS.find((s) => s.id === p.system);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectStructure(p.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-amber-500/15 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{p.name}</div>
                      {p.latinName && <div className="text-[10px] italic opacity-70 truncate">{p.latinName}</div>}
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono shrink-0 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sys?.color }} />
                      {sys?.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Bottom Morphological Depth Peel & Camera Controls */}
      <div className="bottom-dock glass">
        <Button
          variant="ghost"
          className="mobile-only dock-layers"
          onClick={() => setPanel((p) => (p === "layers" ? null : "layers"))}
        >
          <Layers3 size={20} />
          <span>Systems</span>
        </Button>

        <div className="explode-control">
          <div className="explode-label">
            <label id="depth-peel-label">Depth Peel</label>
            <output>
              {depthPercent}
              <span>%</span>
            </output>
          </div>
          <Slider
            aria-labelledby="depth-peel-label"
            min={0}
            max={100}
            step={1}
            value={[depthPercent]}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : typeof v === "number" ? v : 0;
              setDepthPercent(val);
            }}
          />
          <div className="slider-endpoints">
            <span>Superficial</span>
            <span>Deep Bone</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 px-1">
          {(["front", "back", "left", "right"] as const).map((v) => (
            <Button
              key={v}
              variant="ghost"
              className="text-xs capitalize px-2"
              onClick={() => setCameraCommand((c) => ({ type: "view", view: v, seq: (c?.seq ?? 0) + 1 }))}
            >
              {v}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="icon-button"
            title={autoRotate ? "Stop Auto-Rotate" : "Auto-Rotate"}
            onClick={() => setAutoRotate((r) => !r)}
          >
            {autoRotate ? <Pause size={16} /> : <Play size={16} />}
          </Button>
        </div>

        <Button variant="ghost" className="dock-reset" onClick={resetView}>
          <RotateCcw size={18} />
          <span>{t("reset")}</span>
        </Button>
      </div>

      {/* Footer Attribution Notice (Required by CC BY-NC-SA 4.0) */}
      <footer className="studio-footer">
        <span>
          Z-Anatomy (2,827 meshes) <b>·</b> BodyParts3D & Z-Anatomy (CC BY-NC-SA 4.0) <b>·</b> Double-click to focus
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            setDetailsOpen(false);
            setPanel(null);
            setAboutOpen(true);
          }}
        >
          {t("sourceCredits")} <ArrowUpRight size={12} />
        </Button>
      </footer>

      {/* Progressive Streaming Indicator */}
      {!error && (
        <div
          className={`loading glass ${loadStatus.progress > 0 && loadStatus.progress < 100 ? "is-streaming" : ""} ${loadStatus.progress >= 100 ? "is-complete" : ""}`}
          role="status"
          aria-hidden={loadStatus.progress >= 100}
        >
          <Activity size={18} />
          <div>
            <strong>Streaming Z-Anatomy</strong>
            <span>
              {loadStatus.progress}% · {loadStatus.message}
            </span>
            <div className="loading-track">
              <i style={{ width: `${loadStatus.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="loading glass error" role="alert">
          <p>{error}</p>
          <Button variant="ghost" onClick={() => location.reload()}>
            {t("reloadViewer")}
          </Button>
        </div>
      )}

      {/* Structure Details Inspector Sheet */}
      <Sheet open={detailsOpen && !!selectedPart} modal={false} onOpenChange={setDetailsOpen}>
        <SheetContent className="detail-sheet glass">
          {selectedPart && (
            <>
              <div className="detail-header">
                <div className="eyebrow flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedSystemMeta?.color }} />
                  <span>{selectedSystemMeta?.name ?? selectedPart.system}</span>
                  {selectedPart.side && <span>· {selectedPart.side}</span>}
                  {!selectedPart.official && (
                    <Badge variant="outline" className="text-[9px] ml-1">
                      Non-TA Variant
                    </Badge>
                  )}
                </div>
                <SheetTitle className="structure-title">{selectedPart.name}</SheetTitle>
                {selectedPart.latinName && (
                  <SheetDescription className="italic text-xs">
                    {selectedPart.latinName} (Terminologia Anatomica)
                  </SheetDescription>
                )}
              </div>

              <div className="detail-body space-y-3 overflow-y-auto pr-1">
                {matchedOrgan && onOpenInAtelier && (
                  <Button
                    className="w-full justify-between"
                    onClick={() => onOpenInAtelier(matchedOrgan.organId)}
                  >
                    <span className="flex items-center gap-2">
                      <Microscope size={15} /> Open {matchedOrgan.name} in Organ Atelier
                    </span>
                    <ChevronRight size={15} />
                  </Button>
                )}

                {selectedDef.text ? (
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 text-xs leading-relaxed space-y-1.5">
                    <div className="font-bold uppercase tracking-wider text-[10px] opacity-70">Anatomical Notes</div>
                    <p>{selectedDef.text}</p>
                    {selectedDef.url && (
                      <a
                        href={selectedDef.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold underline"
                      >
                        Read full Wikipedia reference <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs opacity-75">
                    Part of <strong>{selectedSystemMeta?.latinName || selectedPart.system}</strong> in Z-Anatomy ({allPartsList.length.toLocaleString()} structures).
                  </p>
                )}

                {/* Individual Structure Transparency Slider */}
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Structure Opacity</span>
                    <span className="font-mono">{Math.round((opacities[selectedPart.id] ?? 1) * 100)}%</span>
                  </div>
                  <Slider
                    min={15}
                    max={100}
                    step={5}
                    value={[Math.round((opacities[selectedPart.id] ?? 1) * 100)]}
                    onValueChange={(v) => {
                      const val = (Array.isArray(v) ? v[0] : typeof v === "number" ? v : 100) / 100;
                      setOpacities((prev) => ({ ...prev, [selectedPart.id]: val }));
                    }}
                  />
                </div>

                {/* Hierarchical Containment Relationships */}
                {(selectedContainment?.parentId || (selectedContainment?.childIds.length ?? 0) > 0) && (
                  <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 space-y-2 text-xs">
                    <div className="font-bold uppercase tracking-wider text-[10px] opacity-70">
                      Z-Anatomy Hierarchy
                    </div>
                    {selectedContainment?.parentId && partsMap[selectedContainment.parentId] && (
                      <div>
                        <span className="opacity-65">Contained in: </span>
                        <button
                          type="button"
                          onClick={() => selectStructure(selectedContainment.parentId)}
                          className="font-semibold text-amber-600 dark:text-amber-400 underline"
                        >
                          {partsMap[selectedContainment.parentId].name}
                        </button>
                      </div>
                    )}
                    {selectedContainment && selectedContainment.childIds.length > 0 && (
                      <div className="space-y-1">
                        <div className="opacity-65">
                          Contains ({selectedContainment.childIds.length}):
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                          {selectedContainment.childIds.slice(0, 20).map((cid) => (
                            <button
                              key={cid}
                              type="button"
                              onClick={() => selectStructure(cid)}
                              className="px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 hover:bg-amber-500/20 text-[10px]"
                            >
                              {partsMap[cid]?.name || cid}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Anatomical Relationships Graph */}
                {relationships.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 text-xs">
                    <div className="font-bold uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">
                      Clinical Connectivity ({relationships.length})
                    </div>
                    {relationships.map((rel) => (
                      <div key={rel.id} className="text-[11px] leading-snug">
                        <span className="font-bold uppercase text-[10px]">{rel.type.replace(/_/g, " ")}:</span>{" "}
                        {rel.targetName} — <span className="opacity-80">{rel.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="detail-actions flex flex-wrap gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    setCameraCommand((c) => ({ type: "focus", partId: selectedPart.id, seq: (c?.seq ?? 0) + 1 }))
                  }
                >
                  <Focus size={15} />
                  Focus
                </Button>
                <Button
                  variant={isolatedId === selectedPart.id ? "default" : "outline"}
                  onClick={() => setIsolatedId((cur) => (cur === selectedPart.id ? null : selectedPart.id))}
                >
                  {isolatedId === selectedPart.id ? <Eye size={15} /> : <RotateCw size={15} />}
                  {isolatedId === selectedPart.id ? "Show Context" : "Isolate"}
                </Button>
                <Button
                  variant="ghost"
                  title="Ghost non-selected structures when isolated"
                  onClick={() => setGhostOthers((g) => !g)}
                >
                  <Ghost size={15} />
                  {ghostOthers ? "Ghost On" : "Ghost Off"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setHiddenIds((prev) => (prev.includes(selectedPart.id) ? prev : [...prev, selectedPart.id]));
                    setDetailsOpen(false);
                  }}
                >
                  <EyeOff size={15} />
                  Hide
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dataset License & Attribution Modal */}
      <Sheet open={aboutOpen} onOpenChange={setAboutOpen}>
        <SheetContent className="about-sheet glass">
          <div className="eyebrow">UPSTREAM ATTRIBUTION · CC BY-NC-SA 4.0</div>
          <SheetTitle className="structure-title">Z-Anatomy (nqwrc/3d-anatomy)</SheetTitle>
          <SheetDescription>
            2,827 anatomical structures across 7 Draco-compressed systems integrated natively with three-mesh-bvh.
          </SheetDescription>
          <div className="about-copy space-y-2 text-xs leading-relaxed">
            <p>
              <strong>Required Upstream Attributions:</strong>
              <br />• BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan
              <br />• Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0
            </p>
            <p>
              <strong>Additional Adapted Components:</strong>
              <br />• Cranial Nerves & Foramina - University of Dundee, CAHID - CC-BY 4.0
              <br />• Anatomy of the Inner Ear - University of Dundee School of Medicine - CC-BY-NC-SA 4.0
              <br />• Kidney - lissiecowley - CC-BY-NC 4.0
              <br />• Wikipedia Contributors (Definitions) - CC BY-SA 3.0 & GFDL
            </p>
            <div className="flex flex-col gap-1.5 pt-2">
              <a href="https://github.com/nqwrc/3d-anatomy" target="_blank" rel="noreferrer">
                nqwrc/3d-anatomy Repository <ArrowUpRight size={14} />
              </a>
              <a href="/z-anatomy/LICENSE.txt" target="_blank" rel="noreferrer">
                View CC BY-NC-SA 4.0 License <ArrowUpRight size={14} />
              </a>
              <a href="/z-anatomy/NOTICE.txt" target="_blank" rel="noreferrer">
                View Upstream NOTICE <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

