"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { MapPin, Navigation, Loader2, Search, Check, Plus, ChevronRight, SlidersHorizontal } from "lucide-react";

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

interface TempleItem {
  id: string;
  name: string;
  denomination: string | null;
  address: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  isMyTemple: boolean;
  isFavorite: boolean;
}

interface TempleWithDistance extends TempleItem {
  distanceKm: number | null;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyTemplesClient({
  temples,
  hasMember,
  initialTab = "all",
  denominations,
  initialDenomination,
  initialSearch,
}: {
  temples: TempleItem[];
  hasMember: boolean;
  initialTab?: "all" | "following";
  denominations: string[];
  initialDenomination: string;
  initialSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [sorted, setSorted] = useState<TempleWithDistance[]>(
    temples.map((t) => ({ ...t, distanceKm: null }))
  );
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(temples.filter((t) => t.isFavorite).map((t) => t.id))
  );
  const [geoState, setGeoState] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [tab, setTab] = useState<"all" | "following">(initialTab);
  const [search, setSearch] = useState(initialSearch);
  const [denomination, setDenomination] = useState(initialDenomination);
  const [prefecture, setPrefecture] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // サーバーフィルタ（denomination / search）が変わったら URL を更新してリフェッチ
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab === "following") params.set("tab", "following");
    if (denomination) params.set("denomination", denomination);
    if (search.trim()) params.set("search", search.trim());
    router.replace(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denomination, search]);

  // 位置情報
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: userLat, longitude: userLon } = pos.coords;
        setSorted((prev) => {
          const withDist = prev.map((t) => ({
            ...t,
            distanceKm:
              t.latitude != null && t.longitude != null
                ? haversineKm(userLat, userLon, t.latitude, t.longitude)
                : null,
          }));
          withDist.sort((a, b) => {
            if (a.distanceKm == null && b.distanceKm == null) return 0;
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            return a.distanceKm - b.distanceKm;
          });
          return withDist;
        });
        setGeoState("granted");
      },
      () => setGeoState("denied"),
      { timeout: 8000 }
    );
  }, []);

  // テンプルリスト更新時に favorites / sorted を同期
  useEffect(() => {
    setSorted(temples.map((t) => ({ ...t, distanceKm: null })));
    setFavorites(new Set(temples.filter((t) => t.isFavorite).map((t) => t.id)));
  }, [temples]);

  function toggleFavorite(e: React.MouseEvent, templeId: string) {
    e.preventDefault();
    if (!hasMember || pendingId === templeId) return;
    const isNowFav = favorites.has(templeId);
    setPendingId(templeId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isNowFav) next.delete(templeId);
      else next.add(templeId);
      return next;
    });
    startTransition(async () => {
      try {
        if (isNowFav) {
          await fetch(`/api/favorites/temples/${templeId}`, { method: "DELETE" });
        } else {
          await fetch("/api/favorites/temples", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templeId }),
          });
        }
      } catch {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isNowFav) next.add(templeId);
          else next.delete(templeId);
          return next;
        });
      } finally {
        setPendingId(null);
      }
    });
  }

  // クライアント側フィルタ（tab / prefecture）+ 「すべて」タブではフォロー寺院を先頭に
  const filtered = sorted
    .filter((t) => {
      if (tab === "following" && !favorites.has(t.id)) return false;
      if (prefecture && !(t.address ?? "").includes(prefecture)) return false;
      return true;
    })
    .sort((a, b) => {
      if (tab !== "all") return 0;
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  const followingCount = favorites.size;
  const hasActiveFilter = !!denomination || !!prefecture;

  return (
    <div className="space-y-3">
      {/* 検索バー */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="お寺の名前・説明文で検索…"
          className="w-full pl-9 pr-10 py-2.5 bg-paper border-[0.5px] border-border font-serif text-sm focus:outline-none focus:border-ink transition-colors"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 transition-colors ${
            showFilters || hasActiveFilter
              ? "text-ink"
              : "text-ink-tertiary hover:text-ink"
          }`}
          aria-label="フィルター"
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* フィルタパネル */}
      {showFilters && (
        <div className="bg-paper p-3 space-y-2" style={{ border: "0.5px solid var(--color-border)" }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-sans text-[10px] text-ink-tertiary uppercase tracking-widest block mb-1">宗派</label>
              <select
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
                className="w-full font-serif text-xs border-[0.5px] border-border px-2.5 py-2 bg-paper focus:outline-none focus:border-ink text-ink"
              >
                <option value="">すべて</option>
                {denominations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-sans text-[10px] text-ink-tertiary uppercase tracking-widest block mb-1">都道府県</label>
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                className="w-full font-serif text-xs border-[0.5px] border-border px-2.5 py-2 bg-paper focus:outline-none focus:border-ink text-ink"
              >
                <option value="">すべて</option>
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          {hasActiveFilter && (
            <button
              onClick={() => { setDenomination(""); setPrefecture(""); }}
              className="font-sans text-xs text-ink-secondary hover:text-ink"
            >
              フィルターをリセット
            </button>
          )}
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-2 font-sans text-xs border-[0.5px] transition-colors ${
            tab === "all"
              ? "bg-ink text-paper border-ink"
              : "bg-paper text-ink-secondary border-border hover:bg-paper-soft"
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setTab("following")}
          className={`flex-1 py-2 font-sans text-xs border-[0.5px] transition-colors flex items-center justify-center gap-1.5 ${
            tab === "following"
              ? "bg-ink text-paper border-ink"
              : "bg-paper text-ink-secondary border-border hover:bg-paper-soft"
          }`}
        >
          {tab === "following" && <Check size={11} />}
          フォロー中
          {followingCount > 0 && (
            <span className={`font-sans text-[10px] ${
              tab === "following" ? "text-paper/70" : "text-ink-tertiary"
            }`}>
              {followingCount}
            </span>
          )}
        </button>
      </div>

      {/* 位置情報ステータス */}
      {geoState !== "idle" && (
        <div
          className={`flex items-center gap-2 px-3 py-2 font-serif text-xs ${
            geoState === "granted" ? "text-ink-secondary" : "text-ink-tertiary"
          }`}
          style={{ border: "0.5px solid var(--color-border-thin)" }}
        >
          {geoState === "loading" ? (
            <><Loader2 size={13} className="animate-spin shrink-0" />位置情報を取得中…</>
          ) : geoState === "granted" ? (
            <><Navigation size={13} className="shrink-0" />現在地から近い順に表示しています</>
          ) : (
            <><MapPin size={13} className="shrink-0" />位置情報が無効のため名前順で表示しています</>
          )}
        </div>
      )}

      {/* フォロー中タブが空 */}
      {tab === "following" && followingCount === 0 && (
        <div className="bg-paper p-10 text-center" style={{ border: "0.5px solid var(--color-border)" }}>
          <p className="font-serif text-sm text-ink-secondary mb-1">フォロー中のお寺がありません</p>
          <p className="font-serif text-xs text-ink-tertiary leading-relaxed">
            「すべて」タブからお寺を<br />フォローしましょう
          </p>
        </div>
      )}

      {/* 寺院リスト */}
      <div className="space-y-2">
        {filtered.map((temple) => {
          const isFav = favorites.has(temple.id);
          return (
            <Link
              key={temple.id}
              href={`/app/temples/${temple.id}`}
              className="flex items-center gap-3 bg-paper px-4 py-3.5 hover:bg-paper-soft transition-colors"
              style={{ border: "0.5px solid var(--color-border)" }}
            >
              {/* 寺名一文字フォールバック */}
              <div
                className="w-11 h-11 bg-paper-soft flex items-center justify-center flex-shrink-0"
                style={{ border: "0.5px solid var(--color-border)" }}
              >
                <span className="font-serif text-base text-ink-tertiary">{temple.name.charAt(0)}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-serif text-sm text-ink font-medium truncate">{temple.name}</p>
                  {temple.isMyTemple && (
                    <span
                      className="font-sans text-[10px] text-ink-secondary bg-paper-soft px-2 py-0.5 shrink-0"
                      style={{ border: "0.5px solid var(--color-border)" }}
                    >
                      所属
                    </span>
                  )}
                  {isFav && !temple.isMyTemple && (
                    <span className="font-sans text-[10px] text-ink-tertiary flex items-center gap-0.5 shrink-0">
                      <Check size={10} />フォロー中
                    </span>
                  )}
                </div>
                {temple.denomination && (
                  <p className="font-serif text-xs text-ink-tertiary">{temple.denomination}</p>
                )}
                {temple.address && (
                  <p className="font-serif text-xs text-ink-tertiary mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={10} className="shrink-0" />
                    {temple.address.slice(0, 24)}{temple.address.length > 24 ? "…" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {temple.distanceKm != null && (
                  <span
                    className="font-sans text-xs text-ink-secondary bg-paper-soft px-2 py-0.5"
                    style={{ border: "0.5px solid var(--color-border-thin)" }}
                  >
                    {temple.distanceKm < 1
                      ? `${Math.round(temple.distanceKm * 1000)}m`
                      : `${temple.distanceKm.toFixed(1)}km`}
                  </span>
                )}
                {hasMember && !temple.isMyTemple && (
                  <button
                    onClick={(e) => toggleFavorite(e, temple.id)}
                    disabled={pendingId === temple.id}
                    className={`w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-50 ${
                      isFav
                        ? "text-ink-secondary bg-paper-soft"
                        : "text-ink-tertiary hover:text-ink hover:bg-paper-soft"
                    }`}
                    style={{ border: "0.5px solid var(--color-border)" }}
                    aria-label={isFav ? "フォロー解除" : "フォロー"}
                  >
                    {isFav ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                )}
                <ChevronRight size={15} className="text-ink-tertiary" />
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && !(tab === "following" && followingCount === 0) && (
        <div className="bg-paper p-8 text-center" style={{ border: "0.5px solid var(--color-border)" }}>
          <p className="font-serif text-sm text-ink-tertiary">該当するお寺が見つかりませんでした</p>
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper font-sans text-xs px-3 py-1.5">
          更新中…
        </div>
      )}
    </div>
  );
}
