"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  ExternalLink,
  FileText,
  NotebookPen,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { UserNote, BookmarkItem } from "@/lib/backend-data";
import type { OrganId } from "@/app/lib/anatomy-data";
import { sounds } from "@/app/lib/sound";

interface NotesCenterProps {
  onClose?: () => void;
  onBack?: () => void;
  backLabel?: string;
  onOpenOrgan?: (organId: OrganId) => void;
  onOpenAtlas?: () => void;
  activeOrganId?: OrganId;
}

export function NotesCenter({
  onClose,
  onBack,
  backLabel,
  onOpenOrgan,
  onOpenAtlas,
  activeOrganId,
}: NotesCenterProps) {
  const [tab, setTab] = useState<"notes" | "bookmarks">("notes");
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // New Note Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newOrganId, setNewOrganId] = useState<OrganId | "">(activeOrganId || "");
  const [newTagInput, setNewTagInput] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/notes").then((r) => r.json() as Promise<{ notes?: UserNote[] }>),
      fetch("/api/bookmarks").then((r) => r.json() as Promise<{ bookmarks?: BookmarkItem[] }>),
    ])
      .then(([notesData, bmData]) => {
        if (notesData.notes) setNotes(notesData.notes);
        if (bmData.bookmarks) setBookmarks(bmData.bookmarks);
      })
      .catch((err) => console.error("Failed to load notes or bookmarks:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    sounds.playCorrect();
    const tags = newTagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          organId: newOrganId || undefined,
          tags,
        }),
      });
      const data = (await res.json()) as { note?: UserNote };
      if (data.note) {
        setNotes((prev) => [data.note!, ...prev]);
        setIsCreating(false);
        setNewTitle("");
        setNewContent("");
        setNewTagInput("");
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    sounds.playClick();
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const filteredNotes = notes.filter((n) => {
    return (
      !query.trim() ||
      `${n.title} ${n.content} ${n.tags.join(" ")} ${n.organId ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });

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
            ? "relative w-full max-w-3xl h-[85vh] max-h-[750px] bg-[#fbf8f4] text-[#2c2623] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#755b46]/20"
            : "relative w-full max-w-5xl h-full bg-[#fbf8f4] text-[#2c2623] rounded-3xl shadow-sm flex flex-col overflow-hidden border border-[#755b46]/20"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#755b46]/15 bg-white/70 backdrop-blur-sm">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <NotebookPen size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Anatomy Study Notes & Saved Bookmarks</h2>
              <p className="text-xs text-[#8d847c]">Persisted clinical pearls, dissections, and bookmarks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && (
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setIsCreating(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2c2623] text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <Plus size={15} /> New Note
              </button>
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-4 px-6 pt-3 border-b border-[#755b46]/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("notes")}
            className={`pb-2.5 transition-colors border-b-2 ${
              tab === "notes"
                ? "border-amber-700 text-amber-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Study Notes ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("bookmarks")}
            className={`pb-2.5 transition-colors border-b-2 ${
              tab === "bookmarks"
                ? "border-amber-700 text-amber-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Saved Specimens ({bookmarks.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* New Note Form */}
          {isCreating ? (
            <form onSubmit={handleCreateNote} className="bg-white p-5 rounded-2xl border border-[#755b46]/20 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-[#2c2623]">Create Anatomy Note</h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-neutral-700">Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Celiac Trunk Branches & Surgical Margins"
                    className="w-full px-3 py-2 bg-neutral-50 border border-[#755b46]/20 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-neutral-700">Content</label>
                  <textarea
                    required
                    rows={4}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Key observations, innervation, clinical pearls, or exam reminders..."
                    className="w-full px-3 py-2 bg-neutral-50 border border-[#755b46]/20 rounded-xl focus:outline-none focus:border-amber-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-neutral-700">Associated Organ (Optional)</label>
                    <select
                      value={newOrganId}
                      onChange={(e) => setNewOrganId(e.target.value as OrganId)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-[#755b46]/20 rounded-xl focus:outline-none"
                    >
                      <option value="">None / General</option>
                      <option value="heart">Heart</option>
                      <option value="brain">Brain</option>
                      <option value="kidneys">Kidneys</option>
                      <option value="liver">Liver</option>
                      <option value="lungs">Lungs</option>
                      <option value="pancreas">Pancreas</option>
                      <option value="intestine">Intestine</option>
                      <option value="skin">Skin</option>
                      <option value="eyeball">Eyeball</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-neutral-700">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="e.g., Surgery, High-Yield, Board"
                      className="w-full px-3 py-2 bg-neutral-50 border border-[#755b46]/20 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#2c2623] hover:bg-neutral-800 text-white shadow-sm transition-all"
                >
                  Save Note
                </button>
              </div>
            </form>
          ) : null}

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your notes and tags..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-[#755b46]/20 focus:outline-none focus:border-amber-600 text-neutral-800"
            />
          </div>

          {tab === "notes" ? (
            /* Notes List */
            loading ? (
              <div className="py-12 text-center text-xs text-neutral-500">Loading notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
                <FileText size={32} className="mx-auto text-neutral-300" />
                <p>No study notes found.</p>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="text-amber-800 font-bold underline"
                >
                  Create your first note
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white p-4 rounded-2xl border border-[#755b46]/15 shadow-sm space-y-2.5 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-[#2c2623]">{note.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                          {note.organId && (
                            <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {note.organId}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {note.organId && onOpenOrgan && (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playClick();
                              onOpenOrgan(note.organId!);
                              if (onClose) onClose();
                            }}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-amber-700 transition-colors"
                            title="Inspect Organ in 3D"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50/60 p-3 rounded-xl border border-neutral-100">
                      {note.content}
                    </p>

                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {note.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Bookmarks List */
            <div className="space-y-3">
              {bookmarks.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500 space-y-1">
                  <Bookmark size={32} className="mx-auto text-neutral-300" />
                  <p>No saved bookmarks yet.</p>
                </div>
              ) : (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="bg-white p-4 rounded-2xl border border-[#755b46]/15 shadow-sm flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900">{bm.name}</h4>
                      <p className="text-[10px] text-neutral-400">
                        {bm.system || "Anatomical Structure"} · Saved {new Date(bm.savedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {bm.targetType === "organ" && onOpenOrgan ? (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          onOpenOrgan(bm.targetId as OrganId);
                          if (onClose) onClose();
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#2c2623] text-white hover:bg-neutral-800 transition-colors"
                      >
                        Inspect in 3D <ExternalLink size={12} />
                      </button>
                    ) : onOpenAtlas ? (
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          onOpenAtlas();
                          if (onClose) onClose();
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors"
                      >
                        View in Atlas <ExternalLink size={12} />
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
