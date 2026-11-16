"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import {
  Brain,
  Layers,
  Heart,
  Activity,
  Zap,
  BookOpen,
  Stethoscope,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { HumanAtlasViewer } from "./atlas/HumanAtlasViewer";
import { OrganAtelierWorkspace } from "./organ/OrganAtelierWorkspace";
import { ImagingWorkspace } from "./imaging/ImagingWorkspace";
import { NerveExplorer } from "./nerve/NerveExplorer";
import { LearningAcademy } from "./learning/LearningAcademy";
import { sounds } from "@/app/lib/sound";
import type { LocaleConfig } from "../i18n/config";
import type { Dictionary } from "../i18n/types";
import type { OrganId } from "@/app/lib/anatomy-data";

export type AppModule =
  | "atlas"
  | "organ"
  | "radiology"
  | "nerve"
  | "academy";

function useSystemTheme(): "light" | "dark" {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        media.removeEventListener("change", onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    () => {
      const saved = localStorage.getItem("anatomy-theme");
      if (saved === "dark" || saved === "light") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    },
    () => "light"
  );
}

const MODULE_LABELS: Record<AppModule, string> = {
  atlas: "Human Atlas",
  organ: "Organ Atelier",
  radiology: "Radiology Lab",
  nerve: "Nerve Explorer",
  academy: "Academy",
};

export function AnatomyApp({
  locale,
  dictionary,
}: {
  locale: LocaleConfig;
  dictionary: Dictionary;
}) {
  const [activeModule, setActiveModule] = useState<AppModule>("atlas");
  const [previousModule, setPreviousModule] = useState<AppModule>("atlas");
  const [selectedOrganId, setSelectedOrganId] = useState<OrganId>("heart");
  const [academyTab, setAcademyTab] = useState<"lessons" | "quizzes" | "notes">("lessons");
  const [academyLessonOrganId, setAcademyLessonOrganId] = useState<OrganId | null>(null);

  const navigateModule = (next: AppModule) => {
    if (next !== activeModule) {
      setPreviousModule(activeModule);
      setActiveModule(next);
    }
  };

  const detectedTheme = useSystemTheme();
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(null);
  const theme = themeOverride ?? detectedTheme;
  const [isMuted, setIsMuted] = useState(() => sounds.getMuted());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    sounds.playClick();
    const next = theme === "dark" ? "light" : "dark";
    setThemeOverride(next);
    try {
      localStorage.setItem("anatomy-theme", next);
    } catch {}
  };

  const toggleMute = () => {
    const next = !isMuted;
    sounds.setMuted(next);
    setIsMuted(next);
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen overflow-hidden bg-neutral-100 dark:bg-slate-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Universal Top Application Bar */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900 px-3 sm:px-4 flex items-center justify-between gap-2 flex-shrink-0 z-30 shadow-xs">
        {/* Brand Identity */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              navigateModule("atlas");
            }}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
              <Brain size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-neutral-900 dark:text-white leading-none whitespace-nowrap">
                  Anatomy Atelier
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300/40 whitespace-nowrap">
                  3D Atlas
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 font-medium leading-none mt-0.5 hidden xl:block">
                Interactive Spatial Anatomy & Medical Diagnostics
              </p>
            </div>
          </button>
        </div>

        {/* Primary Platform Module Switcher */}
        <nav className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-neutral-700 text-[11px] xl:text-xs font-semibold overflow-x-auto min-w-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              navigateModule("atlas");
            }}
            className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeModule === "atlas"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Layers size={14} />
            <span>Human Atlas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              navigateModule("organ");
            }}
            className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeModule === "organ"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Heart size={14} />
            <span>Organ Atelier</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              navigateModule("radiology");
            }}
            className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeModule === "radiology"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Activity size={14} />
            <span>Radiology Lab</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              navigateModule("nerve");
            }}
            className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeModule === "nerve"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <Zap size={14} />
            <span>Nerve Explorer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setAcademyLessonOrganId(null);
              navigateModule("academy");
            }}
            className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeModule === "academy"
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            }`}
          >
            <BookOpen size={14} />
            <span>Academy</span>
          </button>
        </nav>

        {/* Right Controls: Audio & Theme */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
            aria-label="Toggle Audio"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-slate-900 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Toggle Light/Dark Theme"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* 1. Human Atlas 3D */}
        {activeModule === "atlas" && (
          <div className="flex-1 w-full h-full relative">
            <HumanAtlasViewer
              theme={theme}
              onOpenInAtelier={(orgId) => {
                setSelectedOrganId(orgId);
                navigateModule("organ");
              }}
              onSwitchToAtelier={() => navigateModule("organ")}
            />
          </div>
        )}

        {/* 2. Organ Atelier */}
        {activeModule === "organ" && (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <OrganAtelierWorkspace
              theme={theme}
              selectedOrganId={selectedOrganId}
              onSelectOrgan={(id) => setSelectedOrganId(id)}
              onSwitchToAtlas={() => navigateModule("atlas")}
              onOpenAcademyLesson={(orgId) => {
                setSelectedOrganId(orgId);
                setAcademyTab("lessons");
                setAcademyLessonOrganId(orgId);
                navigateModule("academy");
              }}
              onOpenAcademyQuiz={() => {
                setAcademyTab("quizzes");
                setAcademyLessonOrganId(null);
                navigateModule("academy");
              }}
              onOpenAcademyNotes={() => {
                setAcademyTab("notes");
                setAcademyLessonOrganId(null);
                navigateModule("academy");
              }}
              dictionary={dictionary}
              localeCode={locale.code}
            />
          </div>
        )}

        {/* 3. Radiology Lab */}
        {activeModule === "radiology" && (
          <div className="flex-1 w-full h-full min-h-0 flex flex-col relative overflow-hidden">
            <ImagingWorkspace
              theme={theme}
              onOpenAtlas={() => navigateModule("atlas")}
            />
          </div>
        )}

        {/* 4. Nerve Explorer */}
        {activeModule === "nerve" && (
          <div className="flex-1 w-full h-full min-h-0 overflow-y-auto px-3 sm:px-6 py-3 relative">
            <NerveExplorer
              theme={theme}
              onOpenAtlas={() => navigateModule("atlas")}
            />
          </div>
        )}

        {/* 5. Learning Academy */}
        {activeModule === "academy" && (
          <div className="flex-1 w-full h-full min-h-0 flex flex-col relative overflow-hidden">
            <LearningAcademy
              theme={theme}
              initialTab={academyTab}
              initialLessonId={academyLessonOrganId}
              activeOrganId={selectedOrganId}
              onBack={() => navigateModule(previousModule === "academy" ? "atlas" : previousModule)}
              backLabel={`Back to ${MODULE_LABELS[previousModule === "academy" ? "atlas" : previousModule]}`}
              onOpenAtlas={() => navigateModule("atlas")}
              onOpenOrgan={(orgId) => {
                setSelectedOrganId(orgId);
                navigateModule("organ");
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
