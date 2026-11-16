"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Lesson } from "@/lib/backend-data";
import type { OrganId } from "@/app/lib/anatomy-data";
import { sounds } from "@/app/lib/sound";

interface LessonsCenterProps {
  onClose?: () => void;
  onBack?: () => void;
  backLabel?: string;
  onOpenOrgan?: (organId: OrganId) => void;
  onOpenAtlas?: () => void;
  initialLessonId?: string | null;
}

export function LessonsCenter({
  onClose,
  onBack,
  backLabel,
  onOpenOrgan,
  onOpenAtlas,
  initialLessonId,
}: LessonsCenterProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [systemFilter, setSystemFilter] = useState<string>("All");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<number, number>>({});
  const [checkpointSubmitted, setCheckpointSubmitted] = useState<Record<number, boolean>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Fetch lessons from backend
  useEffect(() => {
    fetch("/api/lessons")
      .then((res) => res.json() as Promise<{ lessons?: Lesson[] }>)
      .then((data) => {
        if (data.lessons) {
          setLessons(data.lessons);
          if (initialLessonId) {
            const matched = data.lessons.find(
              (l: Lesson) => l.id === initialLessonId || l.slug === initialLessonId || l.organId === initialLessonId
            );
            if (matched) setActiveLesson(matched);
          }
        }
      })
      .catch((err) => console.error("Failed to load lessons:", err))
      .finally(() => setLoading(false));
  }, [initialLessonId]);

  // Toggle completion in backend
  const handleToggleComplete = async (lessonId: string) => {
    sounds.playCorrect();
    try {
      const res = await fetch("/api/lessons/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = (await res.json()) as { success?: boolean; isCompleted?: boolean };
      if (data.success) {
        setLessons((prev) =>
          prev.map((l) => (l.id === lessonId ? { ...l, isCompleted: data.isCompleted } : l))
        );
        if (activeLesson && activeLesson.id === lessonId) {
          setActiveLesson((prev) => (prev ? { ...prev, isCompleted: data.isCompleted } : null));
        }
      }
    } catch (err) {
      console.error("Failed to update lesson progress:", err);
    }
  };

  const systems = useMemo(() => {
    const list = Array.from(new Set(lessons.map((l) => l.system)));
    return ["All", ...list];
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const matchSys = systemFilter === "All" || l.system === systemFilter;
      const matchDiff = difficultyFilter === "All" || l.difficulty === difficultyFilter;
      const matchQ =
        !query.trim() ||
        `${l.title} ${l.subtitle} ${l.overview} ${l.system}`.toLowerCase().includes(query.toLowerCase());
      return matchSys && matchDiff && matchQ;
    });
  }, [lessons, systemFilter, difficultyFilter, query]);

  // Text to speech narration
  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      className={
        onClose
          ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          : "w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      }
    >
      <div
        className={
          onClose
            ? "relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-[#fbf8f4] text-[#2c2623] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#755b46]/20"
            : "relative w-full max-w-6xl h-full bg-[#fbf8f4] text-[#2c2623] rounded-3xl shadow-sm flex flex-col overflow-hidden border border-[#755b46]/20"
        }
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#755b46]/15 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {activeLesson ? (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveLesson(null);
                  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
                  setIsSpeaking(false);
                }}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#755b46]/10 hover:bg-[#755b46]/20 text-[#2c2623] transition-colors"
              >
                <ArrowLeft size={14} /> Back to Catalog
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
                      onBack();
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#755b46]/10 hover:bg-[#755b46]/20 text-[#2c2623] transition-colors flex-shrink-0"
                    title={backLabel || "Back"}
                  >
                    <ArrowLeft size={14} />
                    <span>{backLabel || "Back"}</span>
                  </button>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold leading-tight">Anatomy & Clinical Academy</h2>
                    <p className="text-xs text-[#8d847c]">Interactive medical curricula, microanatomy & case studies</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeLesson && (
              <button
                type="button"
                onClick={() =>
                  handleSpeak(
                    `${activeLesson.title}. ${activeLesson.overview}. ${activeLesson.sections
                      .map((s) => `${s.title}. ${s.content}`)
                      .join(" ")}`
                  )
                }
                className={`p-2 rounded-xl border border-[#755b46]/20 text-xs flex items-center gap-1.5 transition-all ${
                  isSpeaking ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-white hover:bg-neutral-100"
                }`}
                title={isSpeaking ? "Stop Narration" : "Listen to Lesson"}
              >
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span className="hidden sm:inline">{isSpeaking ? "Stop Audio" : "Listen"}</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
                  onClose();
                }}
                className="p-2 rounded-xl hover:bg-neutral-200/80 text-neutral-600 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {activeLesson ? (
          /* Active Lesson Reading View */
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 scroll-smooth">
            {/* Lesson Title Banner */}
            <div className="space-y-3 border-b border-[#755b46]/15 pb-6">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className="px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] text-white shadow-sm"
                  style={{ backgroundColor: activeLesson.accent }}
                >
                  {activeLesson.system}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-neutral-200/80 font-medium text-neutral-700">
                  {activeLesson.difficulty}
                </span>
                <span className="flex items-center gap-1 text-neutral-500 font-medium">
                  <Clock size={13} /> {activeLesson.estimatedMinutes} min read
                </span>
                {activeLesson.isCompleted && (
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 size={13} /> Completed
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2c2623]">
                {activeLesson.title}
              </h1>
              <p className="text-base text-[#755b46] font-medium leading-relaxed italic">
                {activeLesson.subtitle}
              </p>
              <p className="text-sm text-neutral-700 leading-relaxed bg-white/80 p-4 rounded-2xl border border-[#755b46]/10 shadow-sm">
                {activeLesson.overview}
              </p>

              {/* 3D Action Jump Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {activeLesson.organId && onOpenOrgan && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onOpenOrgan(activeLesson.organId!);
                      if (onClose) onClose();
                    }}
                    className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white shadow-md hover:brightness-105 transition-all"
                  >
                    <Sparkles size={14} /> View {activeLesson.organId} in 3D Atelier
                    <ExternalLink size={13} />
                  </button>
                )}
                {onOpenAtlas && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onOpenAtlas();
                      if (onClose) onClose();
                    }}
                    className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-neutral-800 text-white hover:bg-neutral-900 transition-colors shadow-sm"
                  >
                    View in Full Body 3D Atlas
                    <ExternalLink size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {activeLesson.sections.map((section, idx) => (
                <article
                  key={idx}
                  className="bg-white/90 p-6 rounded-2xl border border-[#755b46]/15 shadow-sm space-y-4"
                >
                  <h3 className="text-lg font-bold text-[#2c2623]">{section.title}</h3>
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>

                  {/* Clinical Pearl Highlight */}
                  {section.pearl && (
                    <div className="bg-amber-50/80 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                        <Lightbulb size={15} className="text-amber-600" /> Clinical Pearl
                      </div>
                      <p className="text-xs text-amber-950 font-medium leading-relaxed">
                        {section.pearl}
                      </p>
                    </div>
                  )}

                  {/* Related anatomical structures tags */}
                  {section.structures && section.structures.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                      <span className="font-semibold text-[11px] text-neutral-400">Key Structures:</span>
                      {section.structures.map((struct, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium text-[11px]"
                        >
                          {struct}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {/* In-Lesson Checkpoints */}
            {activeLesson.checkpoints.length > 0 && (
              <div className="space-y-6 pt-4 border-t border-[#755b46]/15">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-600" />
                  <h3 className="text-base font-bold text-[#2c2623]">Knowledge Checkpoints</h3>
                </div>

                <div className="space-y-6">
                  {activeLesson.checkpoints.map((cp, cpIdx) => {
                    const selected = checkpointAnswers[cpIdx];
                    const isSubmitted = checkpointSubmitted[cpIdx];
                    const isCorrect = selected === cp.correctIndex;

                    return (
                      <div
                        key={cpIdx}
                        className="bg-white p-5 rounded-2xl border border-[#755b46]/20 shadow-sm space-y-4"
                      >
                        <p className="text-sm font-semibold text-neutral-900">
                          {cpIdx + 1}. {cp.question}
                        </p>

                        <div className="space-y-2">
                          {cp.options.map((opt, oIdx) => {
                            let itemStyle = "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800";
                            if (isSubmitted) {
                              if (oIdx === cp.correctIndex) {
                                itemStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold";
                              } else if (selected === oIdx) {
                                itemStyle = "bg-rose-50 border-rose-500 text-rose-900";
                              }
                            } else if (selected === oIdx) {
                              itemStyle = "bg-amber-50 border-amber-500 text-amber-900 font-semibold";
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={isSubmitted}
                                onClick={() => {
                                  sounds.playClick();
                                  setCheckpointAnswers((prev) => ({ ...prev, [cpIdx]: oIdx }));
                                }}
                                className={`w-full text-left p-3 rounded-xl border text-xs flex items-center gap-3 transition-colors ${itemStyle}`}
                              >
                                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {!isSubmitted ? (
                          <button
                            type="button"
                            disabled={selected === undefined}
                            onClick={() => {
                              if (selected === cp.correctIndex) {
                                sounds.playCorrect();
                              } else {
                                sounds.playIncorrect();
                              }
                              setCheckpointSubmitted((prev) => ({ ...prev, [cpIdx]: true }));
                            }}
                            className="px-4 py-2 rounded-xl bg-[#2c2623] text-white text-xs font-semibold disabled:opacity-40 hover:bg-neutral-800 transition-colors"
                          >
                            Check Answer
                          </button>
                        ) : (
                          <div
                            className={`p-3 rounded-xl text-xs space-y-1 ${
                              isCorrect ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-rose-50 text-rose-900 border border-rose-200"
                            }`}
                          >
                            <p className="font-bold">{isCorrect ? "✓ Correct!" : "✗ Review Explanation:"}</p>
                            <p className="leading-relaxed">{cp.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Completion Bar */}
            <div className="pt-6 border-t border-[#755b46]/20 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveLesson(null);
                }}
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back to Catalog
              </button>

              <button
                type="button"
                onClick={() => handleToggleComplete(activeLesson.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                  activeLesson.isCompleted
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-[#2c2623] text-white hover:bg-neutral-800"
                }`}
              >
                <CheckCircle2 size={16} />
                {activeLesson.isCompleted ? "Completed ✓ (Click to reset)" : "Mark Lesson as Complete"}
              </button>
            </div>
          </div>
        ) : (
          /* Catalog View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Filter Toolbar */}
            <div className="p-4 sm:p-6 border-b border-[#755b46]/10 bg-white/50 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by topic, organ, physiology, pathology..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-white rounded-xl border border-[#755b46]/20 focus:outline-none focus:border-amber-600 text-neutral-800"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="text-xs bg-white border border-[#755b46]/20 rounded-xl px-3 py-2 text-neutral-700 font-medium focus:outline-none"
                  >
                    <option value="All">All Difficulties</option>
                    <option value="Fundamentals">Fundamentals</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced Medical">Advanced Medical</option>
                  </select>
                </div>
              </div>

              {/* System pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {systems.map((sys) => (
                  <button
                    key={sys}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setSystemFilter(sys);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                      systemFilter === sys
                        ? "bg-[#2c2623] text-white shadow-sm"
                        : "bg-white/80 text-neutral-600 hover:bg-white border border-[#755b46]/10"
                    }`}
                  >
                    {sys}
                  </button>
                ))}
              </div>
            </div>

            {/* Lessons Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loading ? (
                <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                  Loading lessons...
                </div>
              ) : filteredLessons.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <BookOpen size={36} className="text-neutral-300" />
                  <p className="text-sm font-semibold text-neutral-600">No lessons matched your filter</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSystemFilter("All");
                      setDifficultyFilter("All");
                    }}
                    className="text-xs text-amber-700 font-semibold underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        sounds.playClick();
                        setCheckpointAnswers({});
                        setCheckpointSubmitted({});
                        setActiveLesson(lesson);
                      }}
                      className="group cursor-pointer bg-white p-5 rounded-2xl border border-[#755b46]/15 hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: lesson.accent }}
                          >
                            {lesson.badge}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400 flex items-center gap-1 text-[11px]">
                              <Clock size={12} /> {lesson.estimatedMinutes}m
                            </span>
                            {lesson.isCompleted && (
                              <CheckCircle2 size={16} className="text-emerald-600" />
                            )}
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-[#2c2623] group-hover:text-amber-800 transition-colors">
                          {lesson.title}
                        </h3>
                        <p className="text-xs text-[#755b46] font-medium leading-snug line-clamp-1 italic">
                          {lesson.subtitle}
                        </p>
                        <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                          {lesson.overview}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#755b46]/10 text-xs font-semibold text-[#2c2623] group-hover:text-amber-700">
                        <span className="text-[11px] font-medium text-neutral-500">
                          {lesson.sections.length} core sections · {lesson.checkpoints.length} checks
                        </span>
                        <span className="flex items-center gap-1">
                          Start Lesson <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
