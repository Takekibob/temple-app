"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCategoryLabel } from "@/lib/eventCategories";

// ============================================================
// Types
// ============================================================
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  visibility: string;
  category: string;
  fee: number;
  type: "event";
  color: "green" | "blue";
}

interface CalendarReservation {
  id: string;
  title: string;
  date: string;
  startTime: string;
  status: string;
  type: "reservation";
  color: "purple";
}

interface CalendarAnnual {
  id: string;
  title: string;
  date: string;
  description?: string | null;
  type: "annual";
  color: "orange";
}

type CalendarItem = CalendarEvent | CalendarReservation | CalendarAnnual;

interface CalendarData {
  year: number;
  month: number;
  events: CalendarEvent[];
  reservations: CalendarReservation[];
  annualEvents: CalendarAnnual[];
}

interface Props {
  initialData: CalendarData;
  isDanka: boolean;
}

// ============================================================
// Constants
// ============================================================
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const COLOR_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  purple: "bg-violet-500",
  orange: "bg-orange-400",
};

const COLOR_BADGE: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
  purple: "bg-violet-50 text-violet-800 border-violet-200",
  orange: "bg-orange-50 text-orange-800 border-orange-200",
};

const COLOR_ICON: Record<string, string> = {
  green: "🌿",
  blue: "🔷",
  purple: "🙏",
  orange: "🏮",
};


// ============================================================
// Helpers
// ============================================================
function buildGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function getItemStartTime(item: CalendarItem): string {
  if (item.type === "annual") return "";
  return item.startTime ?? "";
}

// ============================================================
// Component
// ============================================================
export default function CalendarClient({ initialData, isDanka }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CalendarData>(initialData);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const allItems: CalendarItem[] = [
    ...data.events,
    ...data.reservations,
    ...data.annualEvents,
  ];

  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of allItems) {
    if (!itemsByDate.has(item.date)) itemsByDate.set(item.date, []);
    itemsByDate.get(item.date)!.push(item);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  async function navigate(dir: 1 | -1) {
    let newYear = data.year;
    let newMonth = data.month + dir;
    if (newMonth > 12) { newYear++; newMonth = 1; }
    if (newMonth < 1) { newYear--; newMonth = 12; }

    setLoading(true);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/calendar?year=${newYear}&month=${newMonth}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setSelectedDate(null);
        }
      } finally {
        setLoading(false);
      }
    });
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigate(dx < 0 ? 1 : -1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.year, data.month]);

  const grid = buildGrid(data.year, data.month);
  const selectedItems = selectedDate ? (itemsByDate.get(selectedDate) ?? []) : [];

  function handleDayTap(day: number | null) {
    if (!day) return;
    const dateStr = `${data.year}-${String(data.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }

  function navigateTo(item: CalendarItem) {
    if (item.type === "event") router.push(`/app/events/${item.id}`);
    else if (item.type === "reservation") router.push(`/app/reservations`);
  }

  const sortedItems = allItems.slice().sort((a, b) => {
    const da = a.date + getItemStartTime(a);
    const db = b.date + getItemStartTime(b);
    return da < db ? -1 : da > db ? 1 : 0;
  });

  return (
    <div className="max-w-lg mx-auto select-none">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-stone-800">行事カレンダー</h1>
      </div>

      {/* 凡例 */}
      <div className="px-4 pb-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1 text-xs text-stone-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          公開イベント
        </span>
        {isDanka && (
          <>
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
              檀家限定
            </span>
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
              法要予約
            </span>
          </>
        )}
        <span className="flex items-center gap-1 text-xs text-stone-500">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          年間行事
        </span>
      </div>

      {/* 月ナビ + グリッド（スワイプ対応） */}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* 月ナビ */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => navigate(-1)}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 active:bg-stone-200 disabled:opacity-40 text-stone-600 text-xl"
            aria-label="前月"
          >
            ‹
          </button>
          <div className="text-center min-w-[120px]">
            <p className="text-lg font-bold text-stone-800">
              {data.year}年{data.month}月
            </p>
            {loading && <p className="text-xs text-stone-400">読み込み中…</p>}
          </div>
          <button
            onClick={() => navigate(1)}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 active:bg-stone-200 disabled:opacity-40 text-stone-600 text-xl"
            aria-label="翌月"
          >
            ›
          </button>
        </div>

        {/* カレンダーグリッド */}
        <div className="px-2 pb-2">
          {/* 曜日 */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-medium py-1 ${
                  i === 0 ? "text-rose-400" : i === 6 ? "text-sky-500" : "text-stone-400"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 日付セル */}
          <div className="space-y-0.5">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-0.5">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="h-14" />;

                  const dateStr = `${data.year}-${String(data.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const items = itemsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const isSun = di === 0;
                  const isSat = di === 6;

                  return (
                    <button
                      key={di}
                      onClick={() => handleDayTap(day)}
                      className={`h-14 rounded-xl flex flex-col items-center pt-1.5 pb-0.5 transition-all active:scale-95 ${
                        isSelected
                          ? "bg-amber-100 border border-amber-400"
                          : isToday
                          ? "bg-amber-50 border border-amber-200"
                          : "hover:bg-stone-100"
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold leading-none mb-1.5 ${
                          isToday
                            ? "text-amber-700"
                            : isSun
                            ? "text-rose-500"
                            : isSat
                            ? "text-sky-500"
                            : "text-stone-700"
                        }`}
                      >
                        {day}
                      </span>
                      <div className="flex flex-wrap justify-center gap-[3px] px-0.5">
                        {items.slice(0, 4).map((item, idx) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${COLOR_DOT[item.color]}`}
                          />
                        ))}
                      </div>
                      {items.length > 4 && (
                        <span className="text-[9px] text-stone-400 leading-none mt-0.5">
                          +{items.length - 4}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 選択日の予定一覧 */}
      {selectedDate && (
        <div className="mx-2 mb-4">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-700">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                  month: "long", day: "numeric", weekday: "short",
                })}
                の予定
              </p>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">予定はありません</p>
            ) : (
              <ul className="divide-y divide-stone-50">
                {selectedItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => navigateTo(item)}
                      disabled={item.type === "annual"}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 ${
                        item.type !== "annual" ? "hover:bg-stone-50 active:bg-stone-100" : ""
                      }`}
                    >
                      <span className="text-base mt-0.5">{COLOR_ICON[item.color]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{item.title}</p>
                        <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                          {item.type !== "annual" && item.startTime && (
                            <span className="text-xs text-stone-500">{item.startTime}</span>
                          )}
                          {item.type === "event" && (
                            <>
                              <span className="text-xs text-stone-400">
                                {getCategoryLabel(item.category)}
                              </span>
                              <span className="text-xs text-stone-400">
                                {item.fee === 0 ? "無料" : `¥${item.fee.toLocaleString()}`}
                              </span>
                            </>
                          )}
                          {item.type === "reservation" && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              item.status === "CONFIRMED"
                                ? "bg-teal-100 text-teal-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {item.status === "CONFIRMED" ? "確定" : "確認待ち"}
                            </span>
                          )}
                          {item.type === "annual" && item.description && (
                            <span className="text-xs text-stone-400">{item.description}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${COLOR_BADGE[item.color]}`}>
                        {item.type === "event"
                          ? item.color === "blue" ? "檀家限定" : "イベント"
                          : item.type === "reservation"
                          ? "法要予約"
                          : "年間行事"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 今月の予定一覧（日付未選択時） */}
      {!selectedDate && (
        <div className="mx-2 mb-4">
          {allItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <p className="text-stone-400 text-sm">この月の予定はありません</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100">
                <p className="text-sm font-semibold text-stone-700">{data.month}月の予定一覧</p>
              </div>
              <ul className="divide-y divide-stone-50">
                {sortedItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => navigateTo(item)}
                      disabled={item.type === "annual"}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
                        item.type !== "annual" ? "hover:bg-stone-50 active:bg-stone-100" : ""
                      }`}
                    >
                      <div className={`w-1 self-stretch rounded-full ${COLOR_DOT[item.color]}`} />
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-xs font-medium text-stone-500">
                          {new Date(item.date + "T00:00:00").toLocaleDateString("ja-JP", {
                            month: "numeric", day: "numeric",
                          })}
                        </p>
                        {item.type !== "annual" && item.startTime && (
                          <p className="text-xs text-stone-400">{item.startTime}</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-800 truncate">{item.title}</p>
                        {item.type === "event" && (
                          <p className="text-xs text-stone-400">
                            {getCategoryLabel(item.category)}
                            {item.fee === 0 ? " · 無料" : ` · ¥${item.fee.toLocaleString()}`}
                          </p>
                        )}
                      </div>
                      {item.type !== "annual" && (
                        <span className="text-stone-300 shrink-0">›</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
