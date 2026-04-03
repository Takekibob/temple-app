"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Navigation, ChevronRight, Loader2 } from "lucide-react";

interface TempleItem {
  id: string;
  name: string;
  denomination: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isMyTemple: boolean;
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

export default function NearbyTemplesClient({ temples }: { temples: TempleItem[] }) {
  const [sorted, setSorted] = useState<TempleWithDistance[]>(
    temples.map((t) => ({ ...t, distanceKm: null }))
  );
  const [geoState, setGeoState] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: userLat, longitude: userLon } = pos.coords;
        const withDist: TempleWithDistance[] = temples.map((t) => ({
          ...t,
          distanceKm:
            t.latitude != null && t.longitude != null
              ? haversineKm(userLat, userLon, t.latitude, t.longitude)
              : null,
        }));
        // 距離あり → 距離順、なし → 末尾
        withDist.sort((a, b) => {
          if (a.distanceKm == null && b.distanceKm == null) return 0;
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
        setSorted(withDist);
        setGeoState("granted");
      },
      () => setGeoState("denied"),
      { timeout: 8000 }
    );
  }, [temples]);

  return (
    <div className="space-y-2.5">
      {/* 位置情報ステータスバー */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
        geoState === "granted"
          ? "bg-teal-50 text-teal-700 border border-teal-100"
          : geoState === "denied"
          ? "bg-stone-100 text-stone-400"
          : geoState === "loading"
          ? "bg-amber-50 text-amber-600 border border-amber-100"
          : "bg-stone-50 text-stone-400"
      }`}>
        {geoState === "loading" ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            位置情報を取得中…
          </>
        ) : geoState === "granted" ? (
          <>
            <Navigation size={13} />
            現在地から近い順に表示しています
          </>
        ) : geoState === "denied" ? (
          <>
            <MapPin size={13} />
            位置情報が無効のため名前順で表示しています
          </>
        ) : null}
      </div>

      {sorted.map((temple) => (
        <Link
          key={temple.id}
          href={`/app/temples/${temple.id}`}
          className={`flex items-center justify-between bg-white rounded-2xl border shadow-sm px-4 py-4 hover:border-amber-200 hover:shadow-md transition-all ${
            temple.isMyTemple ? "border-amber-200" : "border-stone-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
              temple.isMyTemple ? "bg-amber-50" : "bg-stone-50"
            }`}>
              🏯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-stone-800">{temple.name}</p>
                {temple.isMyTemple && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    所属
                  </span>
                )}
              </div>
              {temple.denomination && (
                <p className="text-xs text-stone-400">{temple.denomination}</p>
              )}
              {temple.address && (
                <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                  <MapPin size={10} />
                  {temple.address.slice(0, 20)}{temple.address.length > 20 ? "…" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {temple.distanceKm != null && (
              <span className="text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                {temple.distanceKm < 1
                  ? `${Math.round(temple.distanceKm * 1000)}m`
                  : `${temple.distanceKm.toFixed(1)}km`}
              </span>
            )}
            <ChevronRight size={15} className="text-stone-300" />
          </div>
        </Link>
      ))}
    </div>
  );
}
