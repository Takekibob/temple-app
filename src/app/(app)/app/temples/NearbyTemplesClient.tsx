"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { MapPin, Navigation, Loader2, Search, Heart, ChevronRight } from "lucide-react";

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
}: {
  temples: TempleItem[];
  hasMember: boolean;
}) {
  const [sorted, setSorted] = useState<TempleWithDistance[]>(
    temples.map((t) => ({ ...t, distanceKm: null }))
  );
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(temples.filter((t) => t.isFavorite).map((t) => t.id))
  );
  const [geoState, setGeoState] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "following">("all");
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  const filtered = sorted.filter((t) => {
    if (tab === "following" && !favorites.has(t.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.denomination ?? "").toLowerCase().includes(q) ||
      (t.address ?? "").toLowerCase().includes(q)
    );
  });

  const followingCount = favorites.size;

  return (
    <div className="space-y-3">
      {/* 検索バー */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="お寺の名前・宗派・住所で検索…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-colors"
        />
      </div>

      {/* タブ */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            tab === "all"
              ? "bg-amber-700 text-white border-amber-700 shadow-sm"
              : "bg-white text-stone-500 border-stone-200 hover:border-amber-300"
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setTab("following")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
            tab === "following"
              ? "bg-amber-700 text-white border-amber-700 shadow-sm"
              : "bg-white text-stone-500 border-stone-200 hover:border-amber-300"
          }`}
        >
          <Heart size={11} className={tab === "following" ? "fill-white" : ""} />
          フォロー中
          {followingCount > 0 && (
            <span className={`text-[10px] font-bold px-1.5 rounded-full ${
              tab === "following" ? "bg-white/20" : "bg-amber-50 text-amber-700"
            }`}>
              {followingCount}
            </span>
          )}
        </button>
      </div>

      {/* 位置情報ステータス */}
      {geoState !== "idle" && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
          geoState === "granted"
            ? "bg-teal-50 text-teal-700 border border-teal-100"
            : geoState === "denied"
            ? "bg-stone-100 text-stone-400"
            : "bg-amber-50 text-amber-600 border border-amber-100"
        }`}>
          {geoState === "loading" ? (
            <><Loader2 size={13} className="animate-spin" />位置情報を取得中…</>
          ) : geoState === "granted" ? (
            <><Navigation size={13} />現在地から近い順に表示しています</>
          ) : (
            <><MapPin size={13} />位置情報が無効のため名前順で表示しています</>
          )}
        </div>
      )}

      {/* フォロー中タブが空 */}
      {tab === "following" && followingCount === 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Heart size={20} className="text-rose-300" />
          </div>
          <p className="text-sm font-medium text-stone-600 mb-1">フォロー中のお寺がありません</p>
          <p className="text-xs text-stone-400 leading-relaxed">
            「すべて」タブからお気に入りのお寺を<br />フォローしましょう
          </p>
        </div>
      )}

      {/* 寺院リスト */}
      <div className="space-y-2.5">
        {filtered.map((temple) => {
          const isFav = favorites.has(temple.id);
          return (
            <Link
              key={temple.id}
              href={`/app/temples/${temple.id}`}
              className={`flex items-center gap-3 bg-white rounded-2xl border shadow-sm px-4 py-3.5 hover:shadow-md transition-all ${
                temple.isMyTemple
                  ? "border-amber-200"
                  : isFav
                  ? "border-rose-100 bg-rose-50/20"
                  : "border-stone-100 hover:border-amber-200"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                temple.isMyTemple ? "bg-amber-50" : isFav ? "bg-rose-50" : "bg-stone-50"
              }`}>
                🏯
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-bold text-stone-800 truncate">{temple.name}</p>
                  {temple.isMyTemple && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">
                      所属
                    </span>
                  )}
                  {isFav && !temple.isMyTemple && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full shrink-0">
                      フォロー中
                    </span>
                  )}
                </div>
                {temple.denomination && (
                  <p className="text-xs text-stone-400">{temple.denomination}</p>
                )}
                {temple.address && (
                  <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={10} className="shrink-0" />
                    {temple.address.slice(0, 24)}{temple.address.length > 24 ? "…" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {temple.distanceKm != null && (
                  <span className="text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                    {temple.distanceKm < 1
                      ? `${Math.round(temple.distanceKm * 1000)}m`
                      : `${temple.distanceKm.toFixed(1)}km`}
                  </span>
                )}
                {hasMember && !temple.isMyTemple && (
                  <button
                    onClick={(e) => toggleFavorite(e, temple.id)}
                    disabled={pendingId === temple.id}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isFav
                        ? "bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100"
                        : "text-stone-300 border border-stone-200 hover:border-rose-300 hover:text-rose-400 hover:bg-rose-50"
                    } disabled:opacity-50`}
                    aria-label={isFav ? "フォロー解除" : "フォロー"}
                  >
                    <Heart size={14} className={isFav ? "fill-rose-500" : ""} />
                  </button>
                )}
                <ChevronRight size={15} className="text-stone-300" />
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && !(tab === "following" && followingCount === 0) && (
        <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center shadow-sm">
          <p className="text-sm text-stone-400">該当するお寺が見つかりませんでした</p>
        </div>
      )}
    </div>
  );
}
