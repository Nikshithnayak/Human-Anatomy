"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flame,
  Lightbulb,
  RotateCcw,
  Stethoscope,
  Target,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import type { Quiz, QuizQuestion } from "@/lib/backend-data";
import type { OrganId } from "@/app/lib/anatomy-data";
import { sounds } from "@/app/lib/sound";

interface QuizCenterProps {
  onClose?: () => void;
  onBack?: () => void;
  backLabel?: string;
  onOpenOrgan?: (organId: OrganId) => void;
  onOpenAtlas?: () => void;
  initialQuizId?: string | null;
}

export function QuizCenter({
  onClose,
  onBack,
  backLabel,
  onOpenOrgan,
  onOpenAtlas,
  initialQuizId,
}: QuizCenterProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  // Active quiz session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Result state
  const [isCompleted, setIsCompleted] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    score: number;
    correctCount: number;
    total: number;
    highScore: number;
    review: {
      questionId: string;
      question: string;
      selectedIndex: number;
      correctIndex: number;
      isCorrect: boolean;
      explanation: string;
    }[];
  } | null>(null);

  const startQuiz = (quiz: Quiz) => {
    sounds.playClick();
    setActiveQuiz(quiz);
    setCurrentIndex(0);
    setUserAnswers({});
    setStreak(0);
    setIsAnswered(false);
    setSelectedOption(null);
    setIsCompleted(false);
    setSummaryData(null);
  };

  useEffect(() => {
    fetch("/api/quizzes")
      .then((res) => res.json() as Promise<{ quizzes?: Quiz[] }>)
      .then((data) => {
        if (data.quizzes) {
          setQuizzes(data.quizzes);
          if (initialQuizId) {
            const matched = data.quizzes.find((q: Quiz) => q.id === initialQuizId);
            if (matched) startQuiz(matched);
          }
        }
      })
      .catch((err) => console.error("Failed to load quizzes:", err))
      .finally(() => setLoading(false));
  }, [initialQuizId]);

  const handleSelectOption = (optionIndex: number) => {
    if (isAnswered || !activeQuiz) return;
    const currentQ = activeQuiz.questions[currentIndex];
    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === currentQ.correctIndex;
    if (isCorrect) {
      sounds.playCorrect();
      setStreak((s) => s + 1);
    } else {
      sounds.playIncorrect();
      setStreak(0);
    }

    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
  };

  const handleNext = async () => {
    if (!activeQuiz) return;
    sounds.playClick();

    if (currentIndex < activeQuiz.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsAnswered(false);
      setSelectedOption(null);
    } else {
      // Submit quiz to backend
      try {
        const res = await fetch("/api/quizzes/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quizId: activeQuiz.id,
            answers: userAnswers,
          }),
        });
        const data = (await res.json()) as {
          score: number;
          correctCount: number;
          total: number;
          highScore: number;
          review: {
            questionId: string;
            question: string;
            selectedIndex: number;
            correctIndex: number;
            isCorrect: boolean;
            explanation: string;
          }[];
        };
        setSummaryData(data);
        setIsCompleted(true);
        sounds.playCelebration();
      } catch (err) {
        console.error("Failed to submit quiz:", err);
      }
    }
  };

  const currentQ: QuizQuestion | undefined = activeQuiz?.questions[currentIndex];

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
            ? "relative w-full max-w-4xl h-[90vh] max-h-[800px] bg-[#fbf8f4] text-[#2c2623] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#755b46]/20"
            : "relative w-full max-w-6xl h-full bg-[#fbf8f4] text-[#2c2623] rounded-3xl shadow-sm flex flex-col overflow-hidden border border-[#755b46]/20"
        }
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#755b46]/15 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {activeQuiz ? (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setActiveQuiz(null);
                }}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#755b46]/10 hover:bg-[#755b46]/20 text-[#2c2623] transition-colors"
              >
                ← Exit Quiz
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold leading-tight">Clinical & Anatomy Quiz Center</h2>
                    <p className="text-xs text-[#8d847c]">Diagnostic reasoning, rapid spotters & board exam review</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeQuiz && !isCompleted && streak > 1 && (
              <span className="flex items-center gap-1 text-xs font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 animate-bounce">
                <Flame size={14} className="fill-orange-500" /> {streak} Streak!
              </span>
            )}
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
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

        {/* Body */}
        {activeQuiz ? (
          isCompleted && summaryData ? (
            /* Quiz Completed Summary View */
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 flex flex-col items-center text-center">
              <div className="space-y-3 max-w-md mx-auto pt-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-xl">
                  <Trophy size={40} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2c2623]">Quiz Completed!</h2>
                <p className="text-xs text-neutral-600">
                  You answered {summaryData.correctCount} out of {summaryData.total} questions correctly.
                </p>

                {/* Score badge */}
                <div className="py-4">
                  <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-amber-500/40 bg-white shadow-inner">
                    <span className="text-3xl font-extrabold text-[#2c2623]">{summaryData.score}%</span>
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Score</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => startQuiz(activeQuiz)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2c2623] text-white text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm"
                  >
                    <RotateCcw size={15} /> Retake Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setActiveQuiz(null);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#755b46]/20 text-neutral-800 text-xs font-semibold hover:bg-neutral-50 transition-all"
                  >
                    Choose Another Quiz
                  </button>
                </div>
              </div>

              {/* Answers Review List */}
              <div className="w-full text-left space-y-4 pt-6 border-t border-[#755b46]/15">
                <h3 className="text-sm font-bold text-neutral-700">Detailed Review Breakdown</h3>
                <div className="space-y-4">
                  {summaryData.review.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-2 ${
                        item.isCorrect
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                          : "bg-rose-50/70 border-rose-200 text-rose-950"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {item.isCorrect ? (
                          <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                        )}
                        <div className="space-y-1">
                          <p className="font-bold text-neutral-900">
                            {idx + 1}. {item.question}
                          </p>
                          <p className="text-[11px] leading-relaxed text-neutral-700">
                            {item.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Question View */
            <div className="flex-1 flex flex-col justify-between overflow-y-auto p-6 sm:p-10 space-y-6">
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                    <span>
                      Question {currentIndex + 1} of {activeQuiz.questions.length}
                    </span>
                    <span className="font-bold text-amber-700">{activeQuiz.title}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300 rounded-full"
                      style={{
                        width: `${((currentIndex + 1) / activeQuiz.questions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Vignette / Question Prompt */}
                {currentQ && (
                  <div className="space-y-4">
                    {currentQ.vignette && (
                      <div className="bg-white/80 p-4 rounded-2xl border border-[#755b46]/15 shadow-sm text-xs text-neutral-800 leading-relaxed italic border-l-4 border-l-amber-600">
                        {currentQ.vignette}
                      </div>
                    )}

                    <h3 className="text-lg sm:text-xl font-bold text-[#2c2623] leading-snug">
                      {currentQ.question}
                    </h3>

                    {/* Options */}
                    <div className="space-y-2.5 pt-2">
                      {currentQ.options.map((opt, oIdx) => {
                        let btnStyle =
                          "bg-white hover:bg-neutral-50 border-[#755b46]/15 text-neutral-800 shadow-sm";

                        if (isAnswered) {
                          if (oIdx === currentQ.correctIndex) {
                            btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-md";
                          } else if (selectedOption === oIdx) {
                            btnStyle = "bg-rose-50 border-rose-500 text-rose-950 shadow-md";
                          } else {
                            btnStyle = "bg-white/50 border-neutral-200 text-neutral-400 opacity-60";
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => handleSelectOption(oIdx)}
                            className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 transition-all duration-150 ${btnStyle}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                                isAnswered && oIdx === currentQ.correctIndex
                                  ? "bg-emerald-500 text-white border-emerald-500"
                                  : isAnswered && selectedOption === oIdx
                                    ? "bg-rose-500 text-white border-rose-500"
                                    : "border-neutral-300 text-neutral-600"
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isAnswered && oIdx === currentQ.correctIndex && (
                              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                            )}
                            {isAnswered && selectedOption === oIdx && oIdx !== currentQ.correctIndex && (
                              <XCircle size={18} className="text-rose-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Clinical Rationale Box (Appears after answer) */}
                    {isAnswered && (
                      <div className="bg-amber-50/90 border border-amber-200/80 p-4 rounded-2xl text-xs space-y-2 animate-in fade-in-50 duration-200">
                        <div className="flex items-center gap-2 font-bold text-amber-900">
                          <Lightbulb size={16} className="text-amber-600 shrink-0" />
                          <span>Clinical Rationale & Explanation:</span>
                        </div>
                        <p className="text-neutral-800 leading-relaxed">{currentQ.explanation}</p>

                        {/* Jump to 3D specimen link if present */}
                        <div className="pt-2 flex flex-wrap gap-3">
                          {currentQ.organId && onOpenOrgan && (
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playClick();
                                onOpenOrgan(currentQ.organId!);
                                if (onClose) onClose();
                              }}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline"
                            >
                              <Target size={13} /> View {currentQ.organId} in 3D Atelier
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
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline"
                            >
                              <Target size={13} /> Inspect Full-Body 3D Atlas
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Next / Submit Button */}
              {isAnswered && (
                <div className="flex justify-end pt-4 border-t border-[#755b46]/10">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2c2623] hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all animate-in zoom-in-95 duration-150"
                  >
                    <span>
                      {currentIndex === activeQuiz.questions.length - 1 ? "Submit & View Results" : "Next Question"}
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          /* Quizzes Catalog View */
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#2c2623]">Available Diagnostic Quizzes</h3>
              <p className="text-xs text-neutral-600">
                Choose a clinical assessment to test your anatomical knowledge and diagnostic reasoning.
              </p>
            </div>

            {loading ? (
              <div className="py-20 text-center text-sm text-neutral-500">Loading quizzes...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    onClick={() => startQuiz(quiz)}
                    className="group cursor-pointer bg-white p-6 rounded-2xl border border-[#755b46]/15 hover:border-rose-400 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: quiz.accent }}
                        >
                          {quiz.system}
                        </span>
                        <span className="text-neutral-500 font-medium text-[11px]">
                          {quiz.questionsCount} questions
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-[#2c2623] group-hover:text-rose-700 transition-colors">
                        {quiz.title}
                      </h4>
                      <p className="text-xs text-neutral-600 leading-relaxed">{quiz.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#755b46]/10 text-xs">
                      <span className="text-neutral-500 text-[11px] font-medium">
                        Difficulty: <b>{quiz.difficulty}</b>
                      </span>
                      <span className="font-bold text-[#2c2623] group-hover:text-rose-600 flex items-center gap-1">
                        Start <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
