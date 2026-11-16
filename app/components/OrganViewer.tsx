"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Compass,
  Layers3,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Search,
  Check,
  Crosshair,
  Sparkles,
  X,
} from "lucide-react";
import type { Hotspot, Organ } from "../i18n/merge";
import { format, type UiDictionary } from "../i18n/types";
import type { AnatomyViewer } from "../lib/three/viewer";

type Props = {
  organ: Organ;
  t: UiDictionary;
  autoRotate: boolean;
  onAutoRotate: (enabled: boolean) => void;
  isAnimating?: boolean;
  onToggleAnimation?: (enabled: boolean) => void;
  compare: boolean;
  onCompare: () => void;
  quizActive: boolean;
  onQuizExit: () => void;
  onSwitchToAtlas?: () => void;
  theme?: "light" | "dark";
  onSelectNextOrgan?: () => void;
  onSelectPrevOrgan?: () => void;
};

const PHYSIOLOGY_CYCLE_LABELS: Record<string, string> = {
  heart: "75 BPM · Biphasic Systole / Diastole",
  lungs: "14 BrPM · Diaphragmatic Tidal Expansion",
  brain: "Vasomotor & CSF Pulsation Wave",
  intestine: "Segmental Peristalsis Wave",
  kidneys: "Renal Vascular Perfusion Pulse",
  liver: "Hepatic Venous & Diaphragmatic Excursion",
  pancreas: "Peripancreatic Exocrine & Arterial Pulse",
  eyeball: "Ocular Accommodation & Vascular Pulse",
  skin: "Cutaneous Microvascular & Elastic Tension",
};

/** Fisher–Yates. The quiz asks for every structure once, in a fresh order. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type PickRef = { current: (hotspot: Hotspot) => void };

/**
 * The labelling quiz. Owns its own round state and is mounted with a `key` per
 * organ, so switching specimens restarts it without a resetting effect.
 */
function LabelQuiz({
  hotspots, t, pickRef, flash, screenY, onExit,
}: {
  hotspots: Hotspot[];
  t: UiDictionary;
  pickRef: PickRef;
  flash: (id: string, correct: boolean) => void;
  screenY: (id: string) => number | null;
  onExit: () => void;
}) {
  const [seed, setSeed] = useState(0);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<{ correct: boolean; picked: string; target: string; atTop: boolean } | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const order = useMemo(() => shuffle(hotspots), [hotspots, seed]);
  const target = order[step];
  const finished = step >= order.length;

  // Refreshed after every render so the viewer's long-lived callback always
  // sees the current question. Writing a ref in an effect is safe; writing one
  // during render is not.
  useEffect(() => {
    pickRef.current = (hotspot) => {
      if (!target || answer) return;   // ignore extra clicks while feedback shows
      const correct = hotspot.id === target.id;
      flash(hotspot.id, correct);
      // A miss also marks where the answer actually was — otherwise the learner
      // is told they were wrong but never shown the right structure.
      if (!correct) flash(target.id, true);
      // Sit the card on the opposite half from the structure being revealed —
      // otherwise the panel hides the dot it is telling the learner to look at.
      const revealed = screenY(correct ? hotspot.id : target.id);
      setAnswer({ correct, picked: hotspot.label, target: target.label, atTop: (revealed ?? 0) > 0.55 });
      setResults((list) => [...list, correct]);
      if (correct) setScore((value) => value + 1);
      window.setTimeout(() => {
        setAnswer(null);
        setStep((value) => value + 1);
      }, correct ? 1200 : 2400);   // a miss carries more to read
    };
  });

  const retry = () => {
    setStep(0);
    setScore(0);
    setAnswer(null);
    setResults([]);
    setSeed((value) => value + 1);
  };

  return (
    <>
      {target && (
        <div className="quiz-bar" role="status" aria-live="polite">
          <div className="quiz-prompt">
            <em>{t.quiz.find}</em>
            <strong>{target.label}</strong>
          </div>
          <div className="quiz-meta">
            <span className="quiz-progress">{format(t.quiz.progress, { current: String(step + 1), total: String(order.length) })}</span>
            <ol className="quiz-pips" aria-hidden>
              {order.map((hotspot, index) => (
                <li
                  key={hotspot.id}
                  className={index < results.length ? (results[index] ? "ok" : "no") : index === step ? "now" : ""}
                />
              ))}
            </ol>
            <small>{t.quiz.hint}</small>
          </div>
          <button type="button" onClick={onExit} aria-label={t.quiz.exit}><X size={16} /></button>
        </div>
      )}

      {answer && (
        <div className={`quiz-answer ${answer.correct ? "ok" : "no"} ${answer.atTop ? "at-top" : ""}`} role="status" aria-live="assertive">
          <span className="quiz-answer-icon">{answer.correct ? <Check size={22} /> : <X size={22} />}</span>
          <div>
            <strong>{answer.correct ? t.quiz.correct : t.quiz.wrong}</strong>
            {answer.correct ? (
              <span>{answer.target}</span>
            ) : (
              <>
                <span>{format(t.quiz.reveal, { label: answer.picked })}</span>
                <span className="quiz-answer-hint">{format(t.quiz.answer, { label: answer.target })}</span>
              </>
            )}
          </div>
        </div>
      )}

      {finished && (
        <div className="quiz-summary" role="dialog" aria-modal="true">
          <span className="modal-icon">{score === order.length ? "★" : "✓"}</span>
          <h2>{t.quiz.done}</h2>
          <p>{format(t.quiz.score, { score: String(score), total: String(order.length) })}</p>
          <div className="quiz-summary-actions">
            <button type="button" className="lesson-button" onClick={retry}>{t.quiz.retry}</button>
            <button type="button" onClick={onExit}>{t.quiz.exit}</button>
          </div>
        </div>
      )}
    </>
  );
}

/** `?authoring=1` is read from the URL without a hydration mismatch. */
function useAuthoringFlag() {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("authoring") === "1",
    () => false,
  );
}

export function OrganViewer({
  organ,
  t,
  autoRotate,
  onAutoRotate,
  isAnimating: controlledAnimating,
  onToggleAnimation,
  compare,
  onCompare,
  quizActive,
  onQuizExit,
  onSwitchToAtlas,
  theme,
  onSelectNextOrgan,
  onSelectPrevOrgan,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<AnatomyViewer | null>(null);
  const organRef = useRef(organ);
  const autoRotateRef = useRef(autoRotate);
  const canvasLabelRef = useRef(t.viewer.canvas);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [slowLoad, setSlowLoad] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [internalAnimating, setInternalAnimating] = useState(false);
  const isAnimating = controlledAnimating ?? internalAnimating;
  const isAnimatingRef = useRef(isAnimating);
  useEffect(() => {
    isAnimatingRef.current = isAnimating;
    viewerRef.current?.setAnimation(isAnimating);
  }, [isAnimating]);

  // Opt-in coordinate probe for placing hotspots — not a user-facing feature.
  const authoring = useAuthoringFlag();
  const authoringRef = useRef(authoring);
  const [authorPoint, setAuthorPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // The viewer captures its callbacks once, so live handlers go through refs.
  const pickRef = useRef<(hotspot: Hotspot) => void>(() => {});
  const authorRef = useRef<(point: { x: number; y: number; z: number }) => void>(() => {});
  useEffect(() => {
    authorRef.current = setAuthorPoint;
  }, []);
  useEffect(() => {
    authoringRef.current = authoring;
  }, [authoring]);

  // Instant LRU hits skip any loader flash; uncached downloads surface a smooth
  // progress overlay promptly after 110ms rather than staring at an empty plinth.
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlowLoad(true), 110);
    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    organRef.current = organ;
  }, [organ]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    canvasLabelRef.current = t.viewer.canvas;
    viewerRef.current?.setCanvasLabel(t.viewer.canvas);
  }, [t.viewer.canvas]);

  useEffect(() => {
    let cancelled = false;
    let viewer: AnatomyViewer | null = null;

    void import("../lib/three/viewer").then(({ AnatomyViewer: Viewer }) => {
      if (cancelled || !mountRef.current) return;
      viewer = new Viewer(mountRef.current, {
        onSelect: setSelected,
        onLoading: (isLoading, value) => {
          setLoading(isLoading);
          setProgress(value);
          if (isLoading) setSlowLoad(false);
        },
        onPick: (hotspot) => pickRef.current(hotspot),
        onAuthorPoint: (point) => authorRef.current(point),
      });
      viewerRef.current = viewer;
      viewer.setCanvasLabel(canvasLabelRef.current);
      viewer.setAutoRotate(autoRotateRef.current);
      viewer.setAnimation(isAnimatingRef.current);
      viewer.setAuthoring(authoringRef.current);
      const current = organRef.current;
      viewer.setOrgan(current.model, current.hotspots, current.accent, current.id).catch(() => {
        setLoading(false);
        setProgress(0);
      });
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      viewer?.dispose();
    };
  }, []);

  useEffect(() => {
    viewerRef.current?.setOrgan(organ.model, organ.hotspots, organ.accent, organ.id).catch(() => {
      setLoading(false);
      setProgress(0);
    });
  }, [organ]);

  // A spinning specimen makes "click the mitral valve" a game of chance, so the
  // quiz holds the model still and restores the user's setting on exit.
  useEffect(() => viewerRef.current?.setAutoRotate(autoRotate && !quizActive), [autoRotate, quizActive]);
  useEffect(() => viewerRef.current?.setQuizMode(quizActive), [quizActive]);
  useEffect(() => viewerRef.current?.setAuthoring(authoring), [authoring]);


  // The viewer drives the callout's position directly, so a spinning model
  // never costs a React render.
  const calloutRef = useCallback((node: HTMLDivElement | null) => {
    viewerRef.current?.attachCallout(node);
  }, []);

  useEffect(() => {
    if (theme && viewerRef.current) {
      viewerRef.current.setTheme(theme);
    }
  }, [theme]);

  const handleTool = (tool: string) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (tool === "animate") {
      const next = !isAnimating;
      viewer.setAnimation(next);
      if (onToggleAnimation) onToggleAnimation(next);
      else setInternalAnimating(next);
      setActiveTool(next ? "animate" : null);
      return;
    }
    if (tool === "rotate") onAutoRotate(!autoRotate);
    if (tool === "zoom") {
      const active = viewer.toggleZoom();
      setActiveTool(active ? "zoom" : null);
      return;
    }
    if (tool === "isolate") setActiveTool(viewer.toggleIsolate() ? tool : null);
    if (tool === "section") setActiveTool(viewer.toggleCrossSection() ? tool : null);
    if (tool === "layers") setActiveTool(viewer.toggleLayers() ? tool : null);
    if (tool === "compare") onCompare();
    if (tool === "reset") {
      viewer.reset();
      if (onToggleAnimation) onToggleAnimation(false);
      else setInternalAnimating(false);
      viewer.setAnimation(false);
      setActiveTool(null);
    }
  };

  const tools = [
    { id: "animate", label: isAnimating ? "Pause Motion" : "Play Animation", icon: isAnimating ? Pause : Play },
    { id: "rotate", label: t.tools.rotate, icon: RotateCcw },
    { id: "zoom", label: t.tools.zoom, icon: Search },
    { id: "isolate", label: t.tools.isolate, icon: CircleDashed },
    { id: "section", label: t.tools.section, icon: ScanLine },
    { id: "layers", label: t.tools.layers, icon: Layers3 },
    { id: "compare", label: t.tools.compare, icon: Box },
    { id: "reset", label: t.tools.reset, icon: RotateCcw },
  ];

  return (
    <section className="viewer-shell" aria-label={format(t.viewer.title, { organ: organ.name })}>
      <div className="viewer-glow" style={{ "--organ-accent": organ.accent } as React.CSSProperties} />
      <div ref={mountRef} className="three-mount" />

      {onSelectPrevOrgan && onSelectNextOrgan && (
        <div className="specimen-nav-strip">
          <button
            type="button"
            className="specimen-nav-btn"
            onClick={onSelectPrevOrgan}
            title="Previous Organ"
            aria-label="Previous Organ"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <span className="specimen-nav-tag">{organ.name}</span>
          <button
            type="button"
            className="specimen-nav-btn"
            onClick={onSelectNextOrgan}
            title="Next Organ"
            aria-label="Next Organ"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {onSwitchToAtlas && (
        <button
          type="button"
          className="atlas-jump-btn"
          onClick={onSwitchToAtlas}
          title="Switch to 3D Full Body Atlas"
        >
          <Compass size={16} />
          <span>Full Body 3D Atlas</span>
        </button>
      )}

      <div className="viewer-tools" aria-label={t.tools.label}>
        {tools.map(({ id, label, icon: Icon }) => {
          const isPressed =
            id === "animate"
              ? isAnimating
              : id === "compare"
              ? compare
              : activeTool === id;
          return (
            <button
              key={id}
              type="button"
              className={`tool-button ${isPressed ? "active" : ""}`}
              onClick={() => handleTool(id)}
              aria-pressed={isPressed}
              title={label}
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {isAnimating && !quizActive && (
        <div
          className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 px-3.5 py-1.5 rounded-full bg-rose-600/90 text-white text-[11px] font-bold shadow-md flex items-center gap-2 backdrop-blur-md pointer-events-none whitespace-nowrap"
          role="status"
          aria-live="polite"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{PHYSIOLOGY_CYCLE_LABELS[organ.id] ?? `${organ.name} · Live Physiological Motion`}</span>
        </div>
      )}

      {!quizActive && (
      <aside className="tip-note" aria-label={t.viewer.tip}>
        <span><Sparkles size={15} /> {t.viewer.tip}</span>
        <p>{t.viewer.tipDrag}<br />{t.viewer.tipScroll}<br />{t.viewer.tipClick}</p>
      </aside>
      )}

      {selected && !quizActive && (
        <div className="hotspot-callout" ref={calloutRef} data-side="right">
          <div className="callout-body" style={{ "--hotspot-color": selected.color } as React.CSSProperties}>
            <button className="callout-close" type="button" onClick={() => viewerRef.current?.clearSelection()} aria-label={t.modal.close}>
              <X size={13} />
            </button>
            <b>{selected.label}</b>
            <small>{selected.detail}</small>
          </div>
        </div>
      )}

      {/* Screen-reader equivalent of the dots, which live in the canvas. */}
      <ul className="hotspot-index" aria-label={t.viewer.structures}>
        {organ.hotspots.map((hotspot) => (
          <li key={hotspot.id}>{hotspot.label}: {hotspot.detail}</li>
        ))}
      </ul>

      {quizActive && (
        <LabelQuiz
          key={organ.id}
          hotspots={organ.hotspots}
          t={t}
          pickRef={pickRef}
          flash={(id, correct) => viewerRef.current?.flash(id, correct)}
          screenY={(id) => viewerRef.current?.hotspotScreenY(id) ?? null}
          onExit={onQuizExit}
        />
      )}

      {authoring && (
        <div className="authoring-panel">
          <span><Crosshair size={13} /> authoring</span>
          {authorPoint ? (
            <>
              <code>{`{ id: "", ta: "", position: [${authorPoint.x}, ${authorPoint.y}, ${authorPoint.z}], color: "#ee7c6a" },`}</code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`{ id: "", ta: "", position: [${authorPoint.x}, ${authorPoint.y}, ${authorPoint.z}], color: "#ee7c6a" },`)
                    .then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); });
                }}
              >
                {copied ? "copied" : "copy"}
              </button>
            </>
          ) : (
            <code>click the model to sample a point</code>
          )}
        </div>
      )}

      <div
        className={`model-loader ${loading && slowLoad ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
        aria-hidden={!(loading && slowLoad)}
      >
        <div className="loader-orbit"><Maximize2 size={20} /></div>
        <strong>{format(t.viewer.loading, { organ: organ.name })}</strong>
        <div className="model-loader-track">
          <i style={{ width: `${Math.max(10, Math.round(progress * 100))}%` }} />
        </div>
        <span>{Math.max(10, Math.round(progress * 100))}%</span>
      </div>

      {!quizActive && (
      <button className="auto-rotate" type="button" onClick={() => onAutoRotate(!autoRotate)} aria-pressed={autoRotate}>
        <RotateCcw size={14} /> {t.viewer.autoRotate}
        <span className={`switch ${autoRotate ? "on" : ""}`}><i /></span>
      </button>
      )}

      <div className="view-caption">
        <span>{t.viewer.caption}</span>
        <strong>{organ.scientificName}</strong>
      </div>
    </section>
  );
}
