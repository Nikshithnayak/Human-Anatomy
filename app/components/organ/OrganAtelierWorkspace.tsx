"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  Brain,
  BrainCircuit,
  CheckCircle2,
  CircleHelp,
  FileText,
  GraduationCap,
  Heart,
  Microscope,
  NotebookPen,
  Pause,
  Play,
  Search,
  Share2,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { OrganViewer } from "../OrganViewer";
import { buildOrgans, indexOrgans, type Organ } from "@/app/i18n/merge";
import { format, type Dictionary, type UiDictionary } from "@/app/i18n/types";
import type { OrganId } from "@/app/lib/anatomy-data";
import { sounds } from "@/app/lib/sound";

export type OrganAtelierWorkspaceProps = {
  theme?: "light" | "dark";
  selectedOrganId: OrganId;
  onSelectOrgan: (organId: OrganId) => void;
  onSwitchToAtlas?: () => void;
  onOpenAcademyLesson?: (organId: OrganId) => void;
  onOpenAcademyQuiz?: () => void;
  onOpenAcademyNotes?: () => void;
  dictionary: Dictionary;
  localeCode: string;
};

type ModalType = "lesson" | "quiz" | "animation" | "system" | null;

/**
 * Renders an organ illustration, or its accent glyph fallback for organs without 2D artwork.
 */
export function OrganArt({
  organ,
  asset,
  alt,
  size,
}: {
  organ: Organ;
  asset: "thumb" | "organ" | "microscopic" | "compare" | "location";
  alt: string;
  size?: number;
}) {
  if (!organ.illustrated) {
    const labelling = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };
    return (
      <span className="art-fallback" style={{ "--art-accent": organ.accent } as React.CSSProperties} {...labelling}>
        {organ.icon}
      </span>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      key={`${organ.id}-${asset}`}
      src={`/anatomy/${organ.id}/${asset}.webp`}
      alt={alt}
      width={size}
      height={size}
      loading={asset === "thumb" ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

/**
 * Isolates numerical / unit measurements inside bidirectional context.
 */
export function Measure({ children }: { children: string }) {
  return <bdi dir={/^[\d(]/.test(children.trim()) ? "ltr" : "auto"}>{children}</bdi>;
}

const MODAL_ICON: Record<Exclude<ModalType, null>, string> = {
  quiz: "?",
  animation: "▶",
  system: "⌖",
  lesson: "✦",
};

export function LearningModal({
  type,
  organ,
  t,
  isAnimating,
  onToggleAnimation,
  onClose,
  onOpenAcademyLesson,
}: {
  type: Exclude<ModalType, null>;
  organ: Organ;
  t: UiDictionary;
  isAnimating?: boolean;
  onToggleAnimation?: () => void;
  onClose: () => void;
  onOpenAcademyLesson?: (organId: OrganId) => void;
}) {
  const [selectedQuizIdx, setSelectedQuizIdx] = useState<number | null>(null);
  const vars = { organ: organ.name, location: organ.location };
  const title =
    type === "quiz" ? format(t.modal.quizTitle, vars)
    : type === "animation" ? format(t.modal.motionTitle, vars)
    : type === "system" ? format(t.modal.bodyTitle, vars)
    : format(t.modal.insideTitle, vars);

  const quizChoices = [
    { text: `${organ.function} (${organ.system})`, correct: true },
    { text: `Primarily filters cerebrospinal fluid outside the ${organ.system}`, correct: false },
    { text: `Stores compact cortical bone minerals inside the periosteum`, correct: false },
  ];

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`learning-modal ${type === "system" ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label={t.modal.close} type="button">
          <X size={18} />
        </button>
        <span className="modal-icon">{MODAL_ICON[type]}</span>
        <em>{t.modal.guided}</em>
        <h2 id="modal-title">{title}</h2>
        {type === "quiz" ? (
          <div className="quiz-options">
            <p>{format(t.modal.quizPrompt, vars)}</p>
            {quizChoices.map((choice, idx) => {
              const picked = selectedQuizIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setSelectedQuizIdx(idx);
                    if (choice.correct) sounds.playCelebration();
                  }}
                  className={
                    picked
                      ? choice.correct
                        ? "!border-emerald-500 !bg-emerald-500/15 !text-emerald-700 dark:!text-emerald-300 font-semibold"
                        : "!border-rose-500 !bg-rose-500/15 !text-rose-700 dark:!text-rose-300"
                      : ""
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{choice.text}</span>
                    {picked && choice.correct && <CheckCircle2 size={15} className="shrink-0" />}
                  </span>
                </button>
              );
            })}
            {selectedQuizIdx !== null && (
              <p className="text-xs pt-1">
                {quizChoices[selectedQuizIdx].correct
                  ? `Correct — Blood supply: ${organ.bloodSupply}.`
                  : `Incorrect — Review the specimen key facts for ${organ.name} and try again.`}
              </p>
            )}
          </div>
        ) : type === "system" ? (
          <>
            <p>{format(t.modal.systemIntro, vars)}</p>
            <figure className="modal-figure">
              <OrganArt organ={organ} asset="location" alt="" />
            </figure>
            <dl className="modal-facts">
              <div><dt>{t.modal.system}</dt><dd>{organ.system}</dd></div>
              <div><dt>{t.modal.primaryRole}</dt><dd><Measure>{organ.function}</Measure></dd></div>
              <div><dt>{t.modal.bloodSupply}</dt><dd><Measure>{organ.bloodSupply}</Measure></dd></div>
            </dl>
            <button className="lesson-button" onClick={onClose} type="button">
              {t.modal.continueExploring} <ArrowRight size={16} />
            </button>
          </>
        ) : type === "animation" ? (
          <>
            <p>
              <strong>{organ.function}.</strong> {organ.dailyFact}
            </p>
            <div className={`modal-demo ${isAnimating ? "moving" : ""}`}>
              <OrganArt organ={organ} asset="organ" alt={organ.name} />
            </div>
            <p className="text-xs opacity-80 mt-2">{organ.medical}</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {onToggleAnimation && (
                <button
                  type="button"
                  className="lesson-button"
                  onClick={() => {
                    sounds.playClick();
                    onToggleAnimation();
                  }}
                >
                  {isAnimating ? <Pause size={15} /> : <Play size={15} />}
                  <span>{isAnimating ? "Pause 3D Organ Motion" : "Play 3D Organ Motion"}</span>
                </button>
              )}
              <button className="lesson-button" onClick={onClose} type="button">
                {t.modal.continueExploring} <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              <strong>Microscopic Architecture ({organ.tissue}):</strong> {organ.description}
            </p>
            <div className="modal-demo">
              <OrganArt organ={organ} asset="microscopic" alt={organ.tissue} />
            </div>
            <p className="text-xs opacity-80 mt-2">{organ.medical}</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {onOpenAcademyLesson && (
                <button
                  type="button"
                  className="lesson-button"
                  onClick={() => {
                    onClose();
                    onOpenAcademyLesson(organ.id);
                  }}
                >
                  <GraduationCap size={16} /> Open Full Lesson Module
                </button>
              )}
              <button className="lesson-button" onClick={onClose} type="button">
                {t.modal.continueExploring} <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function OrganAtelierWorkspace({
  theme = "light",
  selectedOrganId,
  onSelectOrgan,
  onSwitchToAtlas,
  onOpenAcademyLesson,
  onOpenAcademyQuiz,
  onOpenAcademyNotes,
  dictionary,
  localeCode,
}: OrganAtelierWorkspaceProps) {
  const t = dictionary.ui;
  const organs = useMemo(() => buildOrgans(dictionary.organs), [dictionary.organs]);
  const organById = useMemo(() => indexOrgans(organs), [organs]);
  const currentOrgan = organById[selectedOrganId] || organs[0];

  const [autoRotate, setAutoRotate] = useState(false);
  const [is3DAnimating, setIs3DAnimating] = useState(false);
  const [compare, setCompare] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [systemFilter, setSystemFilter] = useState("All");

  const workspaceTopRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const prefetched = useRef(new Set<OrganId>());

  // Comparative specimen (Heart compares with Brain, etc.)
  const referenceOrgan = organById[currentOrgan.id === "heart" ? "brain" : "heart"] || organs[0];

  // Distinct system categories across all organs
  const systemCategories = useMemo(() => {
    const set = new Set<string>();
    organs.forEach((o) => {
      if (o.system) set.add(o.system);
    });
    return ["All", ...Array.from(set)];
  }, [organs]);

  // Filtered organ list
  const filteredOrgans = useMemo(() => {
    return organs.filter((item) => {
      const query = searchQuery.trim().toLocaleLowerCase(localeCode);
      const matchesQuery =
        !query ||
        `${item.name} ${item.scientificName} ${item.system}`
          .toLocaleLowerCase(localeCode)
          .includes(query);
      const matchesSystem = systemFilter === "All" || item.system === systemFilter;
      return matchesQuery && matchesSystem;
    });
  }, [organs, searchQuery, systemFilter, localeCode]);

  // Ordered list of IDs for Next / Prev navigation
  const organIdList = useMemo(() => organs.map((o) => o.id), [organs]);

  const selectNextOrgan = useCallback(() => {
    sounds.playClick();
    const currIdx = organIdList.indexOf(currentOrgan.id);
    const nextIdx = (currIdx + 1) % organIdList.length;
    setIs3DAnimating(false);
    onSelectOrgan(organIdList[nextIdx]);
  }, [currentOrgan.id, organIdList, onSelectOrgan]);

  const selectPrevOrgan = useCallback(() => {
    sounds.playClick();
    const currIdx = organIdList.indexOf(currentOrgan.id);
    const prevIdx = (currIdx - 1 + organIdList.length) % organIdList.length;
    setIs3DAnimating(false);
    onSelectOrgan(organIdList[prevIdx]);
  }, [currentOrgan.id, organIdList, onSelectOrgan]);

  // GSAP reveal animation for the clinical info panel on organ switch
  useEffect(() => {
    if (!contentRef.current) return;
    const targets = contentRef.current.querySelectorAll("[data-reveal]");
    gsap.killTweensOf(targets);
    gsap.fromTo(
      targets,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.36,
        stagger: 0.025,
        ease: "power2.out",
        overwrite: true,
        clearProps: "opacity,transform",
      },
    );
  }, [currentOrgan.id]);

  const toggleLivePhysiologicalMotion = useCallback(() => {
    sounds.playClick();
    setIs3DAnimating((prev) => {
      const next = !prev;
      if (next) {
        workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return next;
    });
  }, []);

  // Specimen prefetcher (warms both webp illustrations and 3D GLB geometry cache)
  const prefetchOrgan = useCallback((id: OrganId) => {
    if (prefetched.current.has(id)) return;
    prefetched.current.add(id);
    const meta = organById[id];
    if (meta?.model) {
      void fetch(meta.model, { priority: "low" } as RequestInit).catch(() => {});
    }
    if (meta?.illustrated) {
      ["thumb", "organ", "microscopic", "compare", "location"].forEach((asset) => {
        const img = new Image();
        img.src = `/anatomy/${id}/${asset}.webp`;
      });
    }
  }, [organById]);

  // Warm adjacent specimens & viewer bundle during idle time for instant switching
  useEffect(() => {
    if (!organIdList.length) return;
    const idx = organIdList.indexOf(currentOrgan.id);
    const nextId = organIdList[(idx + 1) % organIdList.length];
    const prevId = organIdList[(idx - 1 + organIdList.length) % organIdList.length];
    const timer = window.setTimeout(() => {
      void import("../../lib/three/viewer").catch(() => {});
      if (nextId) prefetchOrgan(nextId);
      if (prevId && prevId !== nextId) prefetchOrgan(prevId);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [currentOrgan.id, organIdList, prefetchOrgan]);

  return (
    <div ref={workspaceTopRef} className="w-full h-full flex flex-col overflow-y-auto px-3 sm:px-4 py-3 space-y-4">
      {/* Top Main Dissection Workspace */}
      <div className="workspace">
        {/* Left: Specimen Library & Search */}
        <aside className="organ-library">
          <div className="panel-heading">
            <span className="flex items-center gap-1.5 font-bold">
              <Brain size={14} className="text-purple-600 dark:text-purple-400" />
              {t.library.title}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              {organs.length} specimens
            </span>
          </div>

          {/* Search Box */}
          <div className="relative my-2">
            <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search.placeholder || "Search organs or systems..."}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-slate-900/80 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* System Filters */}
          <div className="system-filter-chips" aria-label="Filter systems">
            {systemCategories.map((sys) => (
              <button
                key={sys}
                type="button"
                className={`system-chip ${systemFilter === sys ? "active" : ""}`}
                onClick={() => {
                  sounds.playClick();
                  setSystemFilter(sys);
                }}
              >
                {sys}
              </button>
            ))}
          </div>

          {/* Organ Specimen List */}
          <div className="organ-list">
            {filteredOrgans.map((item) => {
              const isSelected = item.id === currentOrgan.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`organ-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    sounds.playClick();
                    setIs3DAnimating(false);
                    onSelectOrgan(item.id);
                    setCompare(false);
                  }}
                  onPointerEnter={() => prefetchOrgan(item.id)}
                  onFocus={() => prefetchOrgan(item.id)}
                  style={{ "--item-accent": item.accent } as React.CSSProperties}
                  title={`${item.name} (${item.scientificName})`}
                >
                  <span className="organ-glyph">
                    <OrganArt organ={item} asset="thumb" alt={item.name} size={47} />
                  </span>
                  <div>
                    <b>{item.name}</b>
                    <small className="flex items-center gap-1">
                      <span className="italic">{item.scientificName}</span>
                      <span>•</span>
                      <span>{item.system}</span>
                    </small>
                  </div>
                  {isSelected && <Heart className="favorite" size={14} fill="currentColor" />}
                </button>
              );
            })}
            {filteredOrgans.length === 0 && (
              <div className="p-4 text-center text-xs text-neutral-400">
                No anatomical organs matched &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>

          <button
            type="button"
            className="view-all mt-2"
            onClick={() => {
              sounds.playClick();
              setSearchQuery("");
              setSystemFilter("All");
            }}
          >
            <span>{t.library.viewAll}</span>
            <ArrowRight size={14} />
          </button>
        </aside>

        {/* Center: 3D High-Fidelity Dissection Stage */}
        <OrganViewer
          organ={currentOrgan}
          t={t}
          theme={theme}
          autoRotate={autoRotate}
          onAutoRotate={setAutoRotate}
          isAnimating={is3DAnimating}
          onToggleAnimation={setIs3DAnimating}
          compare={compare}
          onCompare={() => setCompare(!compare)}
          quizActive={quizActive}
          onQuizExit={() => setQuizActive(false)}
          onSwitchToAtlas={onSwitchToAtlas}
          onSelectNextOrgan={selectNextOrgan}
          onSelectPrevOrgan={selectPrevOrgan}
        />

        {/* Right: Clinical & Anatomical Dossier Panel */}
        <aside className="info-panel" ref={contentRef}>
          <div className="info-kicker" data-reveal>
            <Heart size={13} fill="currentColor" /> {format(t.info.kicker, { organ: currentOrgan.name })}
          </div>

          <div className="info-title-row" data-reveal>
            <div>
              <h1>{currentOrgan.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-serif italic text-purple-700 dark:text-purple-300">
                  {currentOrgan.scientificName}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-400">
                  {currentOrgan.system}
                </span>
              </div>
              <em className="text-xs opacity-75 block mt-1">{currentOrgan.poetic}</em>
            </div>
            <span className="specimen-stamp">
              <OrganArt organ={currentOrgan} asset="organ" alt={currentOrgan.name} size={92} />
            </span>
          </div>

          <p className="description text-xs leading-relaxed" data-reveal>
            {currentOrgan.description}
          </p>

          <div className="rule" />

          <h2 data-reveal>{t.info.keyFacts}</h2>
          <dl className="key-facts">
            <div data-reveal>
              <dt><span>◇</span> {t.info.size}</dt>
              <dd><Measure>{currentOrgan.size}</Measure></dd>
            </div>
            <div data-reveal>
              <dt><span>♙</span> {t.info.weight}</dt>
              <dd><Measure>{currentOrgan.weight}</Measure></dd>
            </div>
            <div data-reveal>
              <dt><span>⌁</span> {t.info.daily}</dt>
              <dd><Measure>{currentOrgan.dailyFact}</Measure></dd>
            </div>
            <div data-reveal>
              <dt><span>⌖</span> {t.info.location}</dt>
              <dd><Measure>{currentOrgan.location}</Measure></dd>
            </div>
            <div data-reveal>
              <dt><span>❋</span> {t.info.bloodSupply}</dt>
              <dd><Measure>{currentOrgan.bloodSupply}</Measure></dd>
            </div>
            <div data-reveal>
              <dt><span>◈</span> {t.info.function}</dt>
              <dd><Measure>{currentOrgan.function}</Measure></dd>
            </div>
          </dl>

          <div className="medical-note" data-reveal>
            <Stethoscope size={16} />
            <p>
              <b>{t.info.medical} </b>
              {currentOrgan.medical}
            </p>
          </div>

          <div className="fun-note" data-reveal>
            <Sparkles size={15} />
            <p>
              <b>{t.info.didYouKnow} </b>
              {currentOrgan.funFact}
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            className="lesson-button"
            data-reveal
            onClick={() => {
              sounds.playClick();
              if (onOpenAcademyLesson) {
                onOpenAcademyLesson(currentOrgan.id);
              } else {
                setModal("lesson");
              }
            }}
          >
            <GraduationCap size={16} />
            <span>Open Curriculum Lesson on {currentOrgan.name}</span>
            <ArrowRight size={16} />
          </button>

          {/* Interactive Action Grid */}
          <div className="action-grid" data-reveal>
            <button
              type="button"
              onClick={toggleLivePhysiologicalMotion}
              className={is3DAnimating ? "active" : ""}
              title="Toggle real-time 3D physiological motion"
            >
              {is3DAnimating ? <Pause size={15} /> : <Play size={15} />}
              <span>{is3DAnimating ? "Pause Motion" : t.info.animate}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setQuizActive(true);
              }}
              title="Launch interactive 3D pin labelling spotter"
            >
              <CircleHelp size={15} />
              <span>3D Spotter Quiz</span>
            </button>

            {onOpenAcademyQuiz && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onOpenAcademyQuiz();
                }}
                title="Board review clinical vignettes and spotters"
              >
                <Stethoscope size={15} />
                <span>Clinical Vignette</span>
              </button>
            )}

            {onOpenAcademyNotes && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  onOpenAcademyNotes();
                }}
                title="Spatial study notes & annotations"
              >
                <NotebookPen size={15} />
                <span>Study Notes</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setCompare(!compare);
              }}
              className={compare ? "active" : ""}
              title="Comparative cross-specimen analysis"
            >
              <Share2 size={15} />
              <span>{t.info.compare}</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Comparative Cross-Specimen Strip */}
      {compare && (
        <section className="compare-strip" aria-label={t.compare.title}>
          <div className="compare-organ">
            <OrganArt organ={currentOrgan} asset="thumb" alt={currentOrgan.name} />
            <span>{t.compare.comparing}</span>
            <strong>{currentOrgan.name}</strong>
            <small>{currentOrgan.system}</small>
          </div>

          <b className="text-sm font-bold opacity-60">{t.compare.vs}</b>

          <div className="compare-organ">
            <OrganArt organ={referenceOrgan} asset="thumb" alt={referenceOrgan.name} />
            <span>{t.compare.reference}</span>
            <strong>{referenceOrgan.name}</strong>
            <small>{referenceOrgan.system}</small>
          </div>

          <dl>
            <div>
              <dt>{t.compare.primaryRole}</dt>
              <dd><Measure>{currentOrgan.function}</Measure></dd>
            </div>
            <div>
              <dt>{t.compare.scale}</dt>
              <dd><Measure>{currentOrgan.size}</Measure></dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => setCompare(false)}
            aria-label={t.compare.close}
            className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </section>
      )}

      {/* Deep Learning & Histology Exploration Cards */}
      <section className="learning-cards" aria-label={format(t.cards.resources, { organ: currentOrgan.name })}>
        {/* 1. Microscopic Histology Card */}
        <article>
          <header>
            <div>
              <em>{t.cards.microscopic}</em>
              <h3>{currentOrgan.tissue}</h3>
            </div>
            <Microscope size={17} />
          </header>
          <div className="microscope-visual organ-card-image">
            <OrganArt organ={currentOrgan} asset="microscopic" alt={currentOrgan.tissue} />
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setModal("lesson");
            }}
          >
            <span>{t.cards.exploreTissue}</span>
            <ArrowRight size={14} />
          </button>
        </article>

        {/* 2. Organ Comparison Card */}
        <article>
          <header>
            <div>
              <em>{t.cards.compareOrgans}</em>
              <h3>{currentOrgan.comparison}</h3>
            </div>
            <Share2 size={17} />
          </header>
          <div className="comparison-visual organ-card-image">
            <OrganArt organ={currentOrgan} asset="compare" alt={currentOrgan.comparison} />
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setCompare(true);
            }}
          >
            <span>{t.cards.openComparison}</span>
            <ArrowRight size={14} />
          </button>
        </article>

        {/* 3. Physiological Function & Motion Card */}
        <article>
          <header>
            <div>
              <em>{t.cards.functionAnimation}</em>
              <h3>{currentOrgan.function}</h3>
            </div>
            {is3DAnimating ? <Pause size={17} /> : <Play size={17} />}
          </header>
          <button
            type="button"
            className="function-visual organ-card-image"
            onClick={toggleLivePhysiologicalMotion}
            aria-label={format(t.cards.playAria, { organ: currentOrgan.name })}
          >
            <OrganArt organ={currentOrgan} asset="organ" alt="" />
            <i className="function-pulse" />
            <span className="play-badge">
              {is3DAnimating ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleLivePhysiologicalMotion}
          >
            <span>{is3DAnimating ? "Pause 3D Motion" : t.cards.playAnimation}</span>
            <ArrowRight size={14} />
          </button>
        </article>

        {/* 4. Common Pathologies & Clinical Conditions */}
        <article>
          <header>
            <div>
              <em>{t.cards.clinicalNotes}</em>
              <h3>{t.cards.commonConditions}</h3>
            </div>
            <FileText size={17} />
          </header>
          <ul className="text-xs space-y-1 my-2 max-h-36 overflow-y-auto">
            {currentOrgan.conditions.map((condition) => (
              <li key={condition} className="flex items-center gap-1.5 opacity-90">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <span>{condition}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              if (onOpenAcademyQuiz) onOpenAcademyQuiz();
              else setModal("lesson");
            }}
          >
            <span>{t.cards.seeAll}</span>
            <ArrowRight size={14} />
          </button>
        </article>

        {/* 5. System Integration & Compartment Location */}
        <article className="system-card">
          <header>
            <div>
              <em>{t.cards.whereItWorks}</em>
              <h3>{currentOrgan.system}</h3>
            </div>
            <BrainCircuit size={17} />
          </header>
          <button
            type="button"
            className="system-visual organ-card-image"
            onClick={() => {
              sounds.playClick();
              setModal("system");
            }}
            aria-label={format(t.cards.systemAria, { organ: currentOrgan.name })}
          >
            <OrganArt organ={currentOrgan} asset="location" alt="" />
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setModal("system");
            }}
          >
            <span>{t.cards.seeSystem}</span>
            <ArrowRight size={14} />
          </button>
        </article>
      </section>

      {/* Learning Modals */}
      {modal && (
        <LearningModal
          type={modal}
          organ={currentOrgan}
          t={t}
          isAnimating={is3DAnimating}
          onToggleAnimation={toggleLivePhysiologicalMotion}
          onClose={() => setModal(null)}
          onOpenAcademyLesson={onOpenAcademyLesson}
        />
      )}
    </div>
  );
}

