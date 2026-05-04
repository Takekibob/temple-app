"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { TemplePin, MapBounds } from "@/components/teralog/TempleMap";
import TempleAvatar from "@/components/teralog/TempleAvatar";

// Leaflet は SSR 不可
const TempleMap = dynamic(() => import("@/components/teralog/TempleMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-paper-soft">
      <span className="font-serif text-sm text-ink-tertiary">地図を読み込み中…</span>
    </div>
  ),
});

interface Props {
  initialFollowedIds: string[];
  denominations: string[];
}

export default function TempleMapClient({ initialFollowedIds, denominations }: Props) {
  const [temples, setTemples] = useState<TemplePin[]>([]);
  const [selectedTemple, setSelectedTemple] = useState<TemplePin | null>(null);
  const [denomination, setDenomination] = useState("");
  const [followingOnly, setFollowingOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);
  const followedIds = useRef(new Set(initialFollowedIds));
  const boundsRef = useRef<MapBounds | null>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 現在地取得
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 8000 }
    );
  }, []);

  const fetchTemples = useCallback(async (bounds: MapBounds, denom: string, foOnly: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
        limit: "100",
      });
      if (denom) params.set("denomination", denom);
      if (foOnly) params.set("followingOnly", "true");

      const res = await fetch(`/api/temples/map?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setTemples(data.temples ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    boundsRef.current = bounds;
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => {
      fetchTemples(bounds, denomination, followingOnly);
    }, 400); // debounce 400ms
  }, [denomination, followingOnly, fetchTemples]);

  // フィルター変更時に再取得
  useEffect(() => {
    if (!boundsRef.current) return;
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTemples(boundsRef.current, denomination, followingOnly);
  }, [denomination, followingOnly, fetchTemples]);

  return (
    <div className="flex flex-col h-full">
      {/* 上部フィルターバー */}
      <div className="flex items-center gap-2 px-4 py-3 bg-paper" style={{ borderBottom: "0.5px solid #E5E5E5" }}>
        <select
          value={denomination}
          onChange={(e) => setDenomination(e.target.value)}
          className="flex-1 text-sm font-serif font-light text-ink bg-paper py-2 px-3 border-[0.5px] border-border focus:outline-none focus:border-ink"
        >
          <option value="">宗派を選ばず</option>
          {denominations.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFollowingOnly((v) => !v)}
          className={`
            px-3 py-2 text-sm font-serif font-light border-[0.5px] transition-colors
            ${followingOnly ? "bg-ink text-white border-ink" : "bg-paper text-ink border-border"}
          `}
        >
          フォロー中のみ
        </button>
      </div>

      {/* 地図エリア (残り画面全部) */}
      <div className="relative flex-1">
        <TempleMap
          temples={temples}
          selectedTempleId={selectedTemple?.id ?? null}
          onTempleSelect={setSelectedTemple}
          onBoundsChange={handleBoundsChange}
          initialCenter={userCenter ?? [35.6762, 139.6503]}
          initialZoom={12}
        />

        {/* 現在地ボタン */}
        {userCenter && (
          <button
            type="button"
            aria-label="現在地に戻る"
            onClick={() => {
              // mapRef は TempleMap 内部なので URL 経由で再マウントさせる代わりに
              // center state を更新してコンポーネントを key リセット
              setUserCenter((c) => c ? [...c] as [number, number] : c);
            }}
            className="absolute bottom-16 right-3 z-[1000] w-10 h-10 bg-paper border-[0.5px] border-border flex items-center justify-center font-sans text-ink text-base"
            style={{ boxShadow: "none" }}
          >
            ⊕
          </button>
        )}

        {/* ローディングインジケーター */}
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-paper border-[0.5px] border-border px-4 py-1.5">
            <span className="font-serif text-[11px] text-ink-tertiary tracking-section">読み込み中</span>
          </div>
        )}

        {/* 選択中寺院 ミニカード */}
        {selectedTemple && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-paper" style={{ borderTop: "0.5px solid #E5E5E5" }}>
            <Link
              href={`/app/temples/${selectedTemple.id}`}
              className="flex items-center gap-4 px-5 py-4"
            >
              <TempleAvatar
                name={selectedTemple.name}
                imageUrl={selectedTemple.logoUrl ?? undefined}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base text-ink font-light leading-snug truncate">
                  {selectedTemple.name}
                </p>
                {selectedTemple.denomination && (
                  <p className="font-serif text-[11px] text-ink-tertiary font-light tracking-section mt-0.5">
                    {selectedTemple.denomination}
                  </p>
                )}
                {selectedTemple.address && (
                  <p className="font-serif text-[11px] text-ink-secondary font-light mt-0.5 truncate">
                    {selectedTemple.address}
                  </p>
                )}
                {followedIds.current.has(selectedTemple.id) && (
                  <p className="font-serif text-[10px] text-ink-tertiary tracking-section mt-1">
                    フォロー中
                  </p>
                )}
              </div>
              <span className="font-sans text-ink-tertiary text-sm">›</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
