"use client";

import { useEffect, useRef, useCallback } from "react";

export interface TemplePin {
  id: string;
  name: string;
  denomination: string | null;
  address: string | null;
  prefecture: string | null;
  latitude: number;
  longitude: number;
  logoUrl?: string | null;
  isFollowing: boolean;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Props {
  temples: TemplePin[];
  selectedTempleId: string | null;
  onTempleSelect: (temple: TemplePin | null) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

// 墨色ピンのSVG (フォロー中: 塗り, 未フォロー: 線のみ)
function pinSvg(fill: string, stroke: string, initial: string, size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
    <line x1="${size / 2}" y1="${size}" x2="${size / 2}" y2="${size + 8}" stroke="${stroke}" stroke-width="1.5"/>
    <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" font-family="serif" font-size="${Math.round(size * 0.42)}" fill="${fill === "#1A1A1A" ? "#FFFFFF" : "#1A1A1A"}">${initial}</text>
  </svg>`;
}

function selectedPinSvg(fill: string, stroke: string, initial: string) {
  return pinSvg(fill, stroke, initial, 40);
}

export default function TempleMap({
  temples,
  selectedTempleId,
  onTempleSelect,
  onBoundsChange,
  initialCenter = [35.6762, 139.6503], // 東京
  initialZoom = 12,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onTempleSelectRef = useRef(onTempleSelect);

  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  useEffect(() => { onTempleSelectRef.current = onTempleSelect; }, [onTempleSelect]);

  // Leaflet 初期化 (SSR安全: useEffect内)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
    });

    // CartoDB Positron (モノクロ調)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // ズームコントロール 右下
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // bounds変更時にコールバック
    const emitBounds = () => {
      const b = map.getBounds();
      onBoundsChangeRef.current({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };

    map.on("moveend", emitBounds);
    map.on("zoomend", emitBounds);

    // 地図クリックで選択解除
    map.on("click", () => onTempleSelectRef.current(null));

    mapRef.current = map;
    emitBounds();

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ピン更新
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");

    const nextIds = new Set(temples.map((t) => t.id));

    // 不要ピン削除
    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // 追加・更新
    temples.forEach((temple) => {
      const isSelected = temple.id === selectedTempleId;
      const fill = temple.isFollowing ? "#1A1A1A" : "#FFFFFF";
      const stroke = "#1A1A1A";
      const initial = temple.name.charAt(0);
      const size = isSelected ? 40 : 28;
      const svg = isSelected
        ? selectedPinSvg(fill, stroke, initial)
        : pinSvg(fill, stroke, initial, 28);

      const icon = L.divIcon({
        html: svg,
        iconSize: [size, size + 8],
        iconAnchor: [size / 2, size + 8],
        className: "",
      });

      if (markersRef.current.has(temple.id)) {
        markersRef.current.get(temple.id).setIcon(icon);
      } else {
        const marker = L.marker([temple.latitude, temple.longitude], { icon })
          .addTo(map)
          .on("click", (e: Event) => {
            e.stopPropagation?.();
            onTempleSelectRef.current(temple);
          });
        markersRef.current.set(temple.id, marker);
      }
    });
  }, [temples, selectedTempleId]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
