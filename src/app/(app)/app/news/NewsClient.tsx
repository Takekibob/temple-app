"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, User, ChevronRight, Trash2, CheckCheck } from "lucide-react";

interface AnnouncementItem {
  id: string;
  title: string;
  targetSegment: string;
  memberId: string | null;
  publishedAt: string;
  isRead: boolean;
}

interface Props {
  announcements: AnnouncementItem[];
  hasMember: boolean;
}

const SEGMENT_LABELS: Record<string, string> = {
  ALL: "全員",
  DANKA: "檀家",
  GOEN: "ご縁さん",
};

export default function NewsClient({ announcements: initial, hasMember }: Props) {
  const [items, setItems] = useState(initial);
  const router = useRouter();

  const unreadCount = items.filter((a) => !a.isRead).length;

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
    await fetch(`/api/announcements/${id}/read`, { method: "PATCH" });
    router.refresh();
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/announcements/${id}/delete`, { method: "DELETE" });
    router.refresh();
  }

  async function markAllRead() {
    setItems((prev) => prev.map((a) => ({ ...a, isRead: true })));
    await fetch("/api/announcements/read-all", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">お知らせ</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-bold text-white bg-blue-500 rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        {hasMember && unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <CheckCheck size={14} />
            一括確認
          </button>
        )}
      </div>

      <div className="px-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Bell size={22} className="text-stone-400" />
            </div>
            <p className="text-stone-400 text-sm">お知らせはありません</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((a) => (
              <div
                key={a.id}
                className={`relative flex items-center gap-3 bg-white rounded-2xl border shadow-sm px-4 py-3.5 transition-all ${
                  a.isRead
                    ? "border-stone-100"
                    : "border-blue-200 bg-blue-50/30"
                }`}
              >
                {/* 未読ドット */}
                {!a.isRead && (
                  <span className="absolute top-3.5 right-10 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                )}

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  a.memberId ? "bg-blue-50" : "bg-amber-50"
                }`}>
                  {a.memberId
                    ? <User size={15} className="text-blue-600" />
                    : <Bell size={15} className="text-amber-600" />
                  }
                </div>

                <Link
                  href={`/app/news/${a.id}`}
                  onClick={() => { if (!a.isRead && hasMember) markRead(a.id); }}
                  className="flex-1 min-w-0 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {a.memberId ? (
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                          あなた宛
                        </span>
                      ) : a.targetSegment !== "ALL" && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                          {SEGMENT_LABELS[a.targetSegment]}限定
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-snug truncate ${a.isRead ? "font-medium text-stone-700" : "font-bold text-stone-800"}`}>
                      {a.title}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {new Date(a.publishedAt).toLocaleDateString("ja-JP", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-stone-300 shrink-0" />
                </Link>

                {hasMember && (
                  <button
                    onClick={() => deleteItem(a.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    aria-label="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
