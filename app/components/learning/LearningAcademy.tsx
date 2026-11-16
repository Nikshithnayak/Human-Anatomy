"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Target, NotebookPen } from "lucide-react";
import { LessonsCenter } from "../lessons/LessonsCenter";
import { QuizCenter } from "../quiz/QuizCenter";
import { NotesCenter } from "../notes/NotesCenter";
import type { OrganId } from "@/app/lib/anatomy-data";
import { sounds } from "@/app/lib/sound";

interface LearningAcademyProps {
  theme?: "light" | "dark";
  onOpenAtlas?: () => void;
  onOpenOrgan?: (organId: OrganId) => void;
  onBack?: () => void;
  backLabel?: string;
  initialTab?: "lessons" | "quizzes" | "notes";
  initialLessonId?: OrganId | null;
  activeOrganId?: OrganId;
}

export function LearningAcademy({
  theme = "light",
  onOpenAtlas,
  onOpenOrgan,
  onBack,
  backLabel,
  initialTab = "lessons",
  initialLessonId = null,
  activeOrganId,
}: LearningAcademyProps) {
  const [activeTab, setActiveTab] = useState<"lessons" | "quizzes" | "notes">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-slate-950 text-neutral-900 dark:text-neutral-100 font-sans overflow-hidden">
      {/* Subheader Navigation */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs">
            <BookOpen size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                Anatomy Learning Academy
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Curriculum & Board Review
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Structured modules, clinical vignette spotters, and spatial anatomical notes
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("lessons");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "lessons"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <BookOpen size={14} />
            <span>Lessons</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("quizzes");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "quizzes"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Target size={14} />
            <span>Spotter Quizzes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab("notes");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
              activeTab === "notes"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <NotebookPen size={14} />
            <span>Notes & Bookmarks</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === "lessons" && (
          <LessonsCenter
            onOpenAtlas={onOpenAtlas}
            onOpenOrgan={onOpenOrgan}
            onBack={onBack}
            backLabel={backLabel}
            initialLessonId={initialLessonId}
          />
        )}
        {activeTab === "quizzes" && (
          <QuizCenter
            onOpenAtlas={onOpenAtlas}
            onOpenOrgan={onOpenOrgan}
            onBack={onBack}
            backLabel={backLabel}
          />
        )}
        {activeTab === "notes" && (
          <NotesCenter
            onOpenAtlas={onOpenAtlas}
            onOpenOrgan={onOpenOrgan}
            onBack={onBack}
            backLabel={backLabel}
            activeOrganId={activeOrganId}
          />
        )}
      </div>
    </div>
  );
}

