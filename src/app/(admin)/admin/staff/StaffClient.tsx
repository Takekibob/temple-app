"use client";

import { useState, useTransition } from "react";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Props {
  initialStaff: StaffUser[];
  currentUserId: string;
}

const ROLE_LABELS: Record<string, string> = { ADMIN: "住職 / 管理者", STAFF: "スタッフ" };
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-amber-100 text-amber-800",
  STAFF: "bg-teal-100 text-teal-800",
};

export default function StaffClient({ initialStaff, currentUserId }: Props) {
  const [staff, setStaff] = useState<StaffUser[]>(initialStaff);
  const [filterRole, setFilterRole] = useState<string | null>(null);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [inviteLoading, startInvite] = useTransition();
  const [inviteError, setInviteError] = useState("");
  const [inviteDone, setInviteDone] = useState(false);

  // Edit role
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [editLoading, startEdit] = useTransition();

  // Disable confirm
  const [disableId, setDisableId] = useState<string | null>(null);
  const [disableLoading, startDisable] = useTransition();

  const filtered = filterRole ? staff.filter((s) => s.role === filterRole) : staff;

  function openEdit(s: StaffUser) {
    setEditId(s.id);
    setEditRole(s.role as "ADMIN" | "STAFF");
  }

  function handleEditSave() {
    if (!editId) return;
    startEdit(async () => {
      const res = await fetch(`/api/staff/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });
      if (res.ok) {
        const updated: StaffUser = await res.json();
        setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setEditId(null);
      }
    });
  }

  function handleDisable(id: string) {
    startDisable(async () => {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: false } : s)));
        setDisableId(null);
      }
    });
  }

  function handleInvite() {
    if (!inviteEmail.trim()) { setInviteError("メールアドレスを入力してください"); return; }
    setInviteError("");
    startInvite(async () => {
      const res = await fetch("/api/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (res.ok) {
        setInviteDone(true);
        // Re-fetch staff list
        const listRes = await fetch("/api/staff");
        if (listRes.ok) setStaff(await listRes.json());
      } else {
        setInviteError(json.error ?? "招待に失敗しました");
      }
    });
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">スタッフ管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">全 {staff.filter((s) => s.isActive).length} 名（有効）</p>
        </div>
        <button
          onClick={() => { setInviteDone(false); setInviteEmail(""); setInviteName(""); setInviteError(""); setShowInvite(true); }}
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
        >
          ＋ スタッフを招待
        </button>
      </div>

      {/* Permission info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm">
        <p className="font-semibold text-amber-900 mb-2">権限の違い</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="font-medium text-amber-800">🔑 住職 / 管理者（admin）</p>
            <p className="text-amber-700 text-xs mt-0.5">すべての機能にアクセス可能</p>
          </div>
          <div>
            <p className="font-medium text-amber-800">👤 スタッフ（staff）</p>
            <p className="text-amber-700 text-xs mt-0.5">
              以下を除く全機能：スタッフ管理・イベント分析・檀家昇格操作・システム設定の編集
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[null, "ADMIN", "STAFF"].map((r) => (
          <button
            key={String(r)}
            onClick={() => setFilterRole(r)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filterRole === r ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {r === null ? "全員" : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-4 py-3 text-stone-500 font-medium">氏名</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">メールアドレス</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">ロール</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">最終ログイン</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">状態</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className={`border-b border-stone-50 ${!s.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-stone-800">
                  {s.name}
                  {s.id === currentUserId && (
                    <span className="ml-2 text-xs text-stone-400">（自分）</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-600">{s.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[s.role] ?? "bg-stone-100 text-stone-600"}`}>
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500 text-xs">
                  {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "未ログイン"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-400"}`}>
                    {s.isActive ? "有効" : "無効"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {s.id !== currentUserId && s.isActive && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(s)} className="text-amber-700 hover:text-amber-900 text-xs font-medium">
                        ロール変更
                      </button>
                      <button onClick={() => setDisableId(s.id)} className="text-red-400 hover:text-red-600 text-xs">
                        無効化
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Invite Modal ─────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800">スタッフを招待</h2>
              <button onClick={() => setShowInvite(false)} className="text-stone-400 hover:text-stone-600 text-xl">×</button>
            </div>

            {inviteDone ? (
              <div className="px-6 py-10 text-center">
                <p className="text-4xl mb-3">📧</p>
                <p className="text-base font-semibold text-stone-800">招待メールを送信しました</p>
                <p className="text-sm text-stone-500 mt-1">{inviteEmail} に招待メールを送信しました。リンクをクリックしてパスワードを設定してもらってください。</p>
                <button onClick={() => setShowInvite(false)} className="mt-6 px-5 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800">
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">氏名（任意）</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="山田 太郎"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">メールアドレス <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="staff@example.com"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-2">ロール</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["STAFF", "ADMIN"] as const).map((r) => (
                        <label
                          key={r}
                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                            inviteRole === r ? "border-amber-400 bg-amber-50" : "border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          <input type="radio" value={r} checked={inviteRole === r} onChange={() => setInviteRole(r)} className="accent-amber-600" />
                          <div>
                            <p className="text-sm font-medium text-stone-800">{ROLE_LABELS[r]}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
                </div>
                <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-2">
                  <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">
                    キャンセル
                  </button>
                  <button onClick={handleInvite} disabled={inviteLoading} className="px-5 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-50">
                    {inviteLoading ? "送信中…" : "招待メールを送信"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ───────────────────── */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h2 className="text-base font-semibold text-stone-800 mb-4">ロールを変更</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(["STAFF", "ADMIN"] as const).map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                    editRole === r ? "border-amber-400 bg-amber-50" : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <input type="radio" value={r} checked={editRole === r} onChange={() => setEditRole(r)} className="accent-amber-600" />
                  <p className="text-sm font-medium text-stone-800">{ROLE_LABELS[r]}</p>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">キャンセル</button>
              <button onClick={handleEditSave} disabled={editLoading} className="px-5 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-50">
                {editLoading ? "保存中…" : "変更する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Disable Confirm ───────────────────── */}
      {disableId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <p className="text-base font-semibold text-stone-800 mb-2">アカウントを無効化しますか？</p>
            <p className="text-sm text-stone-500 mb-6">データは保持されます。再度有効化するにはSupabase管理画面が必要です。</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDisableId(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">キャンセル</button>
              <button onClick={() => handleDisable(disableId)} disabled={disableLoading} className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50">
                {disableLoading ? "無効化中…" : "無効化する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
