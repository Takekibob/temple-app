"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Shield, User, Plus, X, Mail, ArrowRightLeft } from "lucide-react";

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
const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-amber-100 text-amber-800",
  STAFF: "bg-teal-100 text-teal-800",
};

export default function StaffClient({ initialStaff, currentUserId }: Props) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffUser[]>(initialStaff);
  const [filterRole, setFilterRole] = useState<string | null>(null);

  // Transfer (引き継ぎ)
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferToId, setTransferToId] = useState("");
  const [transferLoading, startTransfer] = useTransition();
  const [transferError, setTransferError] = useState("");
  const currentIsAdmin = staff.find((s) => s.id === currentUserId)?.role === "ADMIN";

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

  function handleTransfer() {
    if (!transferToId) { setTransferError("引き継ぎ先を選んでください"); return; }
    setTransferError("");
    startTransfer(async () => {
      const res = await fetch("/api/staff/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferToId }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowTransfer(false);
        router.refresh();
      } else {
        setTransferError(json.error ?? "引き継ぎに失敗しました");
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
        const listRes = await fetch("/api/staff");
        if (listRes.ok) setStaff(await listRes.json());
      } else {
        setInviteError(json.error ?? "招待に失敗しました");
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <UserCog size={18} className="text-amber-700" />
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">スタッフ管理</h1>
          </div>
          <p className="text-sm text-stone-400">有効 {staff.filter((s) => s.isActive).length} 名</p>
        </div>
        <div className="flex items-center gap-2">
          {currentIsAdmin && staff.filter((s) => s.isActive && s.id !== currentUserId).length > 0 && (
            <button
              onClick={() => { setTransferToId(""); setTransferError(""); setShowTransfer(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition-colors"
            >
              <ArrowRightLeft size={13} />
              代替わり
            </button>
          )}
          <button
            onClick={() => { setInviteDone(false); setInviteEmail(""); setInviteName(""); setInviteError(""); setShowInvite(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 transition-colors shadow-sm"
          >
            <Plus size={14} />スタッフを招待
          </button>
        </div>
      </div>

      {/* 権限説明 */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
        <p className="text-xs font-bold text-amber-900 mb-3">権限の違い</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Shield size={13} className="text-amber-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800">住職 / 管理者</p>
              <p className="text-xs text-amber-600 mt-0.5">すべての機能にアクセス可能</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
              <User size={13} className="text-teal-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-800">スタッフ</p>
              <p className="text-xs text-teal-600 mt-0.5">スタッフ管理・システム設定の編集を除く全機能</p>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-1.5 mb-4 bg-stone-100 rounded-xl p-1 w-fit">
        {[
          { value: null, label: "全員" },
          { value: "ADMIN", label: "住職 / 管理者" },
          { value: "STAFF", label: "スタッフ" },
        ].map((r) => (
          <button
            key={String(r.value)}
            onClick={() => setFilterRole(r.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterRole === r.value ? "bg-white text-amber-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* スタッフカード一覧 */}
      <div className="space-y-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`bg-white rounded-2xl border border-stone-100 shadow-sm p-4 ${!s.isActive ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                s.role === "ADMIN" ? "bg-amber-700" : "bg-teal-600"
              }`}>
                {s.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-bold text-stone-800">{s.name}</span>
                  {s.id === currentUserId && (
                    <span className="text-xs text-stone-400">（自分）</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLES[s.role] ?? "bg-stone-100 text-stone-600"}`}>
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                  {!s.isActive && (
                    <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-400 rounded-full">無効</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-stone-400">
                  <Mail size={10} />
                  <span>{s.email}</span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  最終ログイン: {s.lastLoginAt
                    ? new Date(s.lastLoginAt).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "未ログイン"}
                </p>
              </div>
              {s.id !== currentUserId && s.isActive && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    ロール変更
                  </button>
                  <button
                    onClick={() => setDisableId(s.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    無効化
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 招待モーダル ─────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-stone-800">スタッフを招待</h2>
              <button onClick={() => setShowInvite(false)} className="text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            {inviteDone ? (
              <div className="px-6 py-10 text-center">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-teal-600" />
                </div>
                <p className="text-base font-bold text-stone-800">招待メールを送信しました</p>
                <p className="text-sm text-stone-500 mt-1">{inviteEmail} にリンクを送信しました。クリックしてパスワードを設定してもらってください。</p>
                <button onClick={() => setShowInvite(false)} className="mt-6 px-5 py-2 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800">
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
                      className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="staff@example.com"
                      className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                            <p className="text-xs font-semibold text-stone-800">{ROLE_LABELS[r]}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
                </div>
                <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-2">
                  <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl">
                    キャンセル
                  </button>
                  <button onClick={handleInvite} disabled={inviteLoading} className="px-5 py-2 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 disabled:opacity-50">
                    {inviteLoading ? "送信中…" : "招待メールを送信"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ロール変更モーダル ───────────────────── */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h2 className="text-base font-bold text-stone-800 mb-4">ロールを変更</h2>
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
              <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl">キャンセル</button>
              <button onClick={handleEditSave} disabled={editLoading} className="px-5 py-2 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 disabled:opacity-50">
                {editLoading ? "保存中…" : "変更する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 代替わり・引き継ぎモーダル ───────────────────── */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-800">代替わり・引き継ぎ</h2>
                <p className="text-xs text-stone-400 mt-0.5">管理者権限を別のスタッフへ移します</p>
              </div>
              <button onClick={() => setShowTransfer(false)} className="text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800 font-semibold mb-1">引き継ぎ後の変化</p>
                <p className="text-xs text-amber-700">・選んだ方が「住職 / 管理者」になります</p>
                <p className="text-xs text-amber-700">・あなたは「スタッフ」に変わります</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">引き継ぎ先を選択</label>
                <div className="space-y-2">
                  {staff.filter((s) => s.isActive && s.id !== currentUserId).map((s) => (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        transferToId === s.id ? "border-amber-400 bg-amber-50" : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="radio"
                        value={s.id}
                        checked={transferToId === s.id}
                        onChange={() => setTransferToId(s.id)}
                        className="accent-amber-600"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        s.role === "ADMIN" ? "bg-amber-700" : "bg-teal-600"
                      }`}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{s.name}</p>
                        <p className="text-xs text-stone-400">{ROLE_LABELS[s.role] ?? s.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {transferError && <p className="text-sm text-red-500">{transferError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-2">
              <button onClick={() => setShowTransfer(false)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl">
                キャンセル
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferLoading || !transferToId}
                className="px-5 py-2 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 disabled:opacity-50"
              >
                {transferLoading ? "引き継ぎ中…" : "引き継ぐ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 無効化確認 ───────────────────── */}
      {disableId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <p className="text-base font-bold text-stone-800 mb-2">アカウントを無効化しますか？</p>
            <p className="text-sm text-stone-500 mb-6">データは保持されます。再度有効化するにはSupabase管理画面が必要です。</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDisableId(null)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl">キャンセル</button>
              <button onClick={() => handleDisable(disableId)} disabled={disableLoading} className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50">
                {disableLoading ? "無効化中…" : "無効化する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
