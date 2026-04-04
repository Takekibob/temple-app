"use client";

import { useState, useTransition } from "react";

interface AnnualEvent {
  id: string;
  name: string;
  month: number;
  day: number;
  endDay: number | null;
  description: string | null;
  isRecurring: boolean;
  showOnCalendar: boolean;
}

interface FormState {
  name: string;
  month: string;
  day: string;
  endDay: string;
  description: string;
  isRecurring: boolean;
  showOnCalendar: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  month: "1",
  day: "1",
  endDay: "",
  description: "",
  isRecurring: true,
  showOnCalendar: true,
};

const TEMPLATE_EVENTS = [
  { name: "修正会（しゅしょうえ）", month: 1, day: 1, endDay: 3 },
  { name: "涅槃会（ねはんえ）", month: 2, day: 15 },
  { name: "春のお彼岸", month: 3, day: 17, endDay: 23 },
  { name: "花まつり（灌仏会）", month: 4, day: 8 },
  { name: "お盆（東京盆）", month: 7, day: 13, endDay: 16 },
  { name: "お盆（旧盆）", month: 8, day: 13, endDay: 16 },
  { name: "秋のお彼岸", month: 9, day: 20, endDay: 26 },
  { name: "成道会（じょうどうえ）", month: 12, day: 8 },
  { name: "除夜の鐘", month: 12, day: 31 },
];

function formatDate(month: number, day: number, endDay: number | null): string {
  const start = `${month}/${day}`;
  if (endDay && endDay !== day) return `${start}〜${month}/${endDay}`;
  return start;
}

export default function AnnualEventsClient({ initialEvents }: { initialEvents: AnnualEvent[] }) {
  const [events, setEvents] = useState<AnnualEvent[]>(initialEvents);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnualEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, startSaving] = useTransition();
  const [formError, setFormError] = useState("");

  // Template modal state
  const [showTemplate, setShowTemplate] = useState(false);
  const [templateSelected, setTemplateSelected] = useState<Set<number>>(
    new Set(TEMPLATE_EVENTS.map((_, i) => i))
  );
  const [templateLoading, startTemplate] = useTransition();
  const [templateDone, setTemplateDone] = useState(false);
  const [showTemplateConfirm, setShowTemplateConfirm] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  const filtered = filterMonth
    ? events.filter((e) => e.month === filterMonth)
    : events;

  // ── Modal helpers ──────────────────────────────────
  function openNew() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(ev: AnnualEvent) {
    setEditTarget(ev);
    setForm({
      name: ev.name,
      month: String(ev.month),
      day: String(ev.day),
      endDay: ev.endDay ? String(ev.endDay) : "",
      description: ev.description ?? "",
      isRecurring: ev.isRecurring,
      showOnCalendar: ev.showOnCalendar,
    });
    setFormError("");
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) { setFormError("行事名は必須です"); return; }
    setFormError("");

    startSaving(async () => {
      const body = {
        name: form.name.trim(),
        month: Number(form.month),
        day: Number(form.day),
        endDay: form.endDay ? Number(form.endDay) : null,
        description: form.description || null,
        isRecurring: form.isRecurring,
        showOnCalendar: form.showOnCalendar,
      };

      if (editTarget) {
        const res = await fetch(`/api/annual-events/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated: AnnualEvent = await res.json();
          setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          setShowModal(false);
        } else {
          setFormError("保存に失敗しました");
        }
      } else {
        const res = await fetch("/api/annual-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created: AnnualEvent = await res.json();
          setEvents((prev) =>
            [...prev, created].sort((a, b) => a.month - b.month || a.day - b.day)
          );
          setShowModal(false);
        } else {
          setFormError("保存に失敗しました");
        }
      }
    });
  }

  function handleDelete(id: string) {
    startDeleting(async () => {
      const res = await fetch(`/api/annual-events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setDeleteId(null);
      }
    });
  }

  // ── Template ──────────────────────────────────────
  function handleTemplateRegister() {
    const items = TEMPLATE_EVENTS.filter((_, i) => templateSelected.has(i));
    startTemplate(async () => {
      const res = await fetch("/api/annual-events/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        // Re-fetch full list
        const listRes = await fetch("/api/annual-events");
        if (listRes.ok) setEvents(await listRes.json());
        setTemplateDone(true);
      }
    });
  }

  function toggleTemplate(i: number) {
    setTemplateSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  // ── Days for current form month ──────────────────
  const daysInFormMonth = new Date(2024, Number(form.month), 0).getDate();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">行事管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">全 {events.length} 件</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTemplateDone(false); setTemplateSelected(new Set(TEMPLATE_EVENTS.map((_, i) => i))); setShowTemplate(true); }}
            className="px-3 py-2 border border-stone-300 text-stone-600 text-sm rounded-lg hover:bg-stone-50"
          >
            📋 テンプレート一括登録
          </button>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
          >
            ＋ 新規登録
          </button>
        </div>
      </div>

      {/* Month filter */}
      <div className="flex flex-wrap gap-1 mb-4">
        <button
          onClick={() => setFilterMonth(null)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            filterMonth === null ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
          }`}
        >
          全月
        </button>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <button
            key={m}
            onClick={() => setFilterMonth(m)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterMonth === m ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {m}月
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          {filterMonth ? `${filterMonth}月の行事はありません` : "行事が登録されていません"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">行事名</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">日付</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">繰り返し</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">カレンダー</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">説明</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-800">{ev.name}</td>
                  <td className="px-4 py-3 text-stone-600">{formatDate(ev.month, ev.day, ev.endDay)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ev.isRecurring ? "bg-teal-100 text-teal-800" : "bg-stone-100 text-stone-600"
                    }`}>
                      {ev.isRecurring ? "毎年" : "単年"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ev.showOnCalendar ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-400"
                    }`}>
                      {ev.showOnCalendar ? "表示" : "非表示"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 max-w-xs truncate">{ev.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(ev)}
                        className="text-amber-700 hover:text-amber-900 text-xs font-medium"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteId(ev.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── Form Modal ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800">
                {editTarget ? "行事を編集" : "新規行事登録"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* 行事名 */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">行事名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例: 春のお彼岸"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* 月・日 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">月 <span className="text-red-500">*</span></label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm((f) => ({ ...f, month: e.target.value, day: "1", endDay: "" }))}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">開始日 <span className="text-red-500">*</span></label>
                  <select
                    value={form.day}
                    onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {Array.from({ length: daysInFormMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}日</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">終了日（任意）</label>
                  <select
                    value={form.endDay}
                    onChange={(e) => setForm((f) => ({ ...f, endDay: e.target.value }))}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">—</option>
                    {Array.from({ length: daysInFormMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}日</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">説明（任意）</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="短い説明を入力"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">毎年繰り返し</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isRecurring: !f.isRecurring }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.isRecurring ? "bg-amber-500" : "bg-stone-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isRecurring ? "translate-x-5" : ""}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">利用者カレンダーに表示</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, showOnCalendar: !f.showOnCalendar }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.showOnCalendar ? "bg-amber-500" : "bg-stone-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.showOnCalendar ? "translate-x-5" : ""}`} />
                  </button>
                </label>
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ──────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-base font-semibold text-stone-800 mb-2">行事を削除しますか？</p>
            <p className="text-sm text-stone-500 mb-6">この操作は取り消せません。</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template 重複確認ダイアログ ─────────────── */}
      {showTemplateConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-base font-semibold text-stone-800 mb-2">⚠️ 重複登録の注意</p>
            <p className="text-sm text-stone-600 mb-3">
              すでに <span className="font-semibold text-amber-700">{events.length}件</span> の行事が登録されています。
            </p>
            <p className="text-sm text-stone-600 mb-5">
              テンプレートを一括登録すると、既存の行事と<span className="font-semibold text-red-600">重複して追加</span>されます。同じ行事が複数登録されても自動では削除されません。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTemplateConfirm(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={() => { setShowTemplateConfirm(false); handleTemplateRegister(); }}
                className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
              >
                重複を理解した上で登録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Modal ──────────────────────────── */}
      {showTemplate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800">テンプレートから一括登録</h2>
              <button onClick={() => setShowTemplate(false)} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>

            {templateDone ? (
              <div className="px-6 py-10 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-base font-semibold text-stone-800">登録が完了しました</p>
                <button
                  onClick={() => setShowTemplate(false)}
                  className="mt-6 px-5 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 py-4">
                  <p className="text-sm text-stone-500 mb-4">
                    登録する行事にチェックを入れてください。チェックを外した行事はスキップされます。
                  </p>
                  <div className="space-y-2">
                    {TEMPLATE_EVENTS.map((item, i) => (
                      <label
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          templateSelected.has(i)
                            ? "border-amber-300 bg-amber-50"
                            : "border-stone-200 bg-white hover:bg-stone-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={templateSelected.has(i)}
                          onChange={() => toggleTemplate(i)}
                          className="w-4 h-4 accent-amber-600 shrink-0"
                        />
                        <div>
                          <p className="text-sm font-medium text-stone-800">{item.name}</p>
                          <p className="text-xs text-stone-400">
                            {formatDate(item.month, item.day, item.endDay ?? null)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-500">{templateSelected.size}件を選択中</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTemplate(false)}
                      className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        if (events.length > 0) {
                          setShowTemplateConfirm(true);
                        } else {
                          handleTemplateRegister();
                        }
                      }}
                      disabled={templateLoading || templateSelected.size === 0}
                      className="px-5 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-50"
                    >
                      {templateLoading ? "登録中…" : `${templateSelected.size}件を登録`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
