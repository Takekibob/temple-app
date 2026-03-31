"use client";

import { useState, useTransition } from "react";

type NoteType = "MEMO" | "INTERACTION" | "FOLLOWUP";

interface Note {
  id: string;
  noteType: NoteType;
  title: string | null;
  content: string;
  tags: string[];
  followupDate: string | null;
  isResolved: boolean;
  isPinned: boolean;
  createdAt: string;
  author: { name: string };
}

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  MEMO: "メモ",
  INTERACTION: "対応履歴",
  FOLLOWUP: "フォロー予定",
};

const PRESET_TAGS = ["要フォロー", "要注意", "VIP", "体調注意", "遠方", "一人暮らし", "跡継ぎ不在"];

const TAG_COLORS: Record<string, string> = {
  要フォロー: "bg-amber-100 text-amber-800",
  要注意: "bg-red-100 text-red-700",
  VIP: "bg-green-100 text-green-800",
  体調注意: "bg-orange-100 text-orange-700",
  遠方: "bg-blue-100 text-blue-700",
  一人暮らし: "bg-purple-100 text-purple-700",
  跡継ぎ不在: "bg-stone-100 text-stone-600",
};

export default function NotesClient({
  memberId,
  initialNotes,
}: {
  memberId: string;
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeTab, setActiveTab] = useState<NoteType | "ALL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [isPending, startTransition] = useTransition();

  // フォーム状態
  const [formType, setFormType] = useState<NoteType>("MEMO");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formFollowupDate, setFormFollowupDate] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAddModal() {
    setEditNote(null);
    setFormType("MEMO");
    setFormTitle("");
    setFormContent("");
    setFormTags([]);
    setFormFollowupDate("");
    setFormPinned(false);
    setFormError(null);
    setShowModal(true);
  }

  function openEditModal(note: Note) {
    setEditNote(note);
    setFormType(note.noteType);
    setFormTitle(note.title ?? "");
    setFormContent(note.content);
    setFormTags(note.tags);
    setFormFollowupDate(note.followupDate?.slice(0, 10) ?? "");
    setFormPinned(note.isPinned);
    setFormError(null);
    setShowModal(true);
  }

  function toggleTag(tag: string) {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSave() {
    if (!formContent.trim()) { setFormError("内容を入力してください"); return; }
    startTransition(async () => {
      setFormError(null);
      const body = {
        noteType: formType,
        title: formTitle || null,
        content: formContent,
        tags: formTags,
        followupDate: formFollowupDate || null,
        isPinned: formPinned,
      };
      const url = editNote
        ? `/api/members/${memberId}/notes/${editNote.id}`
        : `/api/members/${memberId}/notes`;
      const res = await fetch(url, {
        method: editNote ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const j = await res.json(); setFormError(j.error ?? "エラーが発生しました"); return; }
      const j = await res.json();
      setNotes((prev) =>
        editNote
          ? prev.map((n) => (n.id === editNote.id ? j.note : n)).sort(sortNotes)
          : [j.note, ...prev].sort(sortNotes)
      );
      setShowModal(false);
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("このメモを削除しますか？")) return;
    const res = await fetch(`/api/members/${memberId}/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleTogglePin(note: Note) {
    const res = await fetch(`/api/members/${memberId}/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !note.isPinned }),
    });
    if (res.ok) {
      const j = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === note.id ? j.note : n)).sort(sortNotes));
    }
  }

  async function handleResolve(note: Note) {
    const res = await fetch(`/api/members/${memberId}/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isResolved: !note.isResolved }),
    });
    if (res.ok) {
      const j = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === note.id ? j.note : n)));
    }
  }

  function sortNotes(a: Note, b: Note) {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }

  const filtered = activeTab === "ALL" ? notes : notes.filter((n) => n.noteType === activeTab);

  return (
    <div>
      {/* タブ */}
      <div className="flex gap-1 mb-4 border-b border-stone-100 pb-2">
        {(["ALL", "MEMO", "INTERACTION", "FOLLOWUP"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeTab === tab
                ? "bg-amber-700 text-white"
                : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            {tab === "ALL" ? "すべて" : NOTE_TYPE_LABELS[tab]}
            <span className="ml-1 text-xs opacity-70">
              ({tab === "ALL" ? notes.length : notes.filter((n) => n.noteType === tab).length})
            </span>
          </button>
        ))}
        <button
          onClick={openAddModal}
          className="ml-auto px-3 py-1.5 text-xs font-medium bg-stone-800 text-white rounded-full hover:bg-stone-700"
        >
          + メモを追加
        </button>
      </div>

      {/* メモ一覧 */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-stone-400 text-sm">
          メモがありません
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((note) => (
            <li
              key={note.id}
              className={`rounded-xl border p-4 ${
                note.isPinned ? "bg-amber-50 border-amber-200" : "bg-white border-stone-200"
              } ${note.noteType === "FOLLOWUP" && note.isResolved ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* ヘッダー行 */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {note.isPinned && <span className="text-amber-600 text-xs">📌</span>}
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      note.noteType === "MEMO" ? "bg-stone-100 text-stone-600" :
                      note.noteType === "INTERACTION" ? "bg-blue-100 text-blue-700" :
                      "bg-teal-100 text-teal-700"
                    }`}>
                      {NOTE_TYPE_LABELS[note.noteType]}
                    </span>
                    {note.tags.map((tag) => (
                      <span key={tag} className={`px-1.5 py-0.5 rounded text-xs font-medium ${TAG_COLORS[tag] ?? "bg-stone-100 text-stone-600"}`}>
                        {tag}
                      </span>
                    ))}
                    {note.noteType === "FOLLOWUP" && note.followupDate && (
                      <span className={`text-xs font-medium ${note.isResolved ? "text-stone-400 line-through" : "text-teal-700"}`}>
                        {note.isResolved ? "✅" : "⏰"} {new Date(note.followupDate).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                  {note.title && (
                    <p className="font-medium text-stone-800 text-sm mb-0.5">{note.title}</p>
                  )}
                  <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <p className="text-xs text-stone-400 mt-2">
                    {new Date(note.createdAt).toLocaleDateString("ja-JP")} {note.author.name}
                  </p>
                </div>

                {/* アクション */}
                <div className="flex gap-1 shrink-0">
                  {note.noteType === "FOLLOWUP" && (
                    <button
                      onClick={() => handleResolve(note)}
                      className="text-xs px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 text-stone-500"
                      title={note.isResolved ? "未完了に戻す" : "完了にする"}
                    >
                      {note.isResolved ? "戻す" : "完了"}
                    </button>
                  )}
                  <button
                    onClick={() => handleTogglePin(note)}
                    className="text-xs px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 text-stone-400"
                    title={note.isPinned ? "ピン解除" : "ピン留め"}
                  >
                    {note.isPinned ? "📌" : "📍"}
                  </button>
                  <button
                    onClick={() => openEditModal(note)}
                    className="text-xs px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 text-stone-500"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-xs px-2 py-1 border border-red-100 rounded hover:bg-red-50 text-red-500"
                  >
                    削除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 追加・編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-800">{editNote ? "メモを編集" : "メモを追加"}</h2>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            {formError && <p className="text-red-600 text-sm">{formError}</p>}

            {/* 種類 */}
            <div>
              <p className="text-xs text-stone-500 mb-1.5">種類</p>
              <div className="flex gap-2">
                {(["MEMO", "INTERACTION", "FOLLOWUP"] as NoteType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      formType === t
                        ? "bg-amber-700 text-white border-amber-700"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {NOTE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* タイトル（対応履歴・フォロー） */}
            {(formType === "INTERACTION" || formType === "FOLLOWUP") && (
              <div>
                <label className="text-xs text-stone-500 block mb-1">見出し</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="例：お盆の挨拶訪問"
                  className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm"
                />
              </div>
            )}

            {/* 内容 */}
            <div>
              <label className="text-xs text-stone-500 block mb-1">内容 <span className="text-red-500">*</span></label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                placeholder="メモの内容を入力..."
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* タグ */}
            <div>
              <p className="text-xs text-stone-500 mb-1.5">タグ（複数選択可）</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formTags.includes(tag)
                        ? (TAG_COLORS[tag] ?? "bg-stone-200 text-stone-700") + " border-transparent"
                        : "border-stone-200 text-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* フォロー予定日 */}
            {formType === "FOLLOWUP" && (
              <div>
                <label className="text-xs text-stone-500 block mb-1">フォロー予定日</label>
                <input
                  type="date"
                  value={formFollowupDate}
                  onChange={(e) => setFormFollowupDate(e.target.value)}
                  className="h-9 rounded-lg border border-stone-200 px-3 text-sm"
                />
              </div>
            )}

            {/* ピン留め */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                className="h-4 w-4 accent-amber-700"
              />
              <span className="text-sm text-stone-600">📌 ピン留めする（重要なメモを上部に固定）</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 py-2.5 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 disabled:opacity-50 font-medium"
              >
                {isPending ? "保存中…" : "保存"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-stone-200 text-sm rounded-xl hover:bg-stone-50 text-stone-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
