"use client";

import { useState, useEffect, useCallback } from "react";

export interface GalleryPhoto {
  url: string;
  caption?: string | null;
}

type Props = {
  photos: GalleryPhoto[];
};

export default function PhotoGallery({ photos }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);

  const prev = useCallback(() => {
    setLightbox((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null));
  }, [photos.length]);

  const next = useCallback(() => {
    setLightbox((i) => (i !== null ? (i + 1) % photos.length : null));
  }, [photos.length]);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, prev, next]);

  if (photos.length === 0) return null;

  return (
    <>
      {/* グリッド表示 */}
      <div className="flex flex-col gap-[0.5px]">
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(i)}
            className="w-full text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.caption ?? `写真 ${i + 1}`}
              className="w-full object-cover"
              style={{ maxHeight: 320 }}
            />
            {photo.caption && (
              <p className="font-serif text-[11px] text-ink-tertiary font-light px-1 py-1.5">
                {photo.caption}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* ライトボックス */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={close}
        >
          <button
            type="button"
            className="absolute top-4 right-4 font-sans text-white text-2xl leading-none z-10"
            onClick={close}
            aria-label="閉じる"
          >
            ✕
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[lightbox].url}
            alt={photos[lightbox].caption ?? `写真 ${lightbox + 1}`}
            className="max-w-full max-h-[85dvh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {photos[lightbox].caption && (
            <p className="absolute bottom-8 left-0 right-0 text-center font-serif text-sm text-white/70 font-light px-6">
              {photos[lightbox].caption}
            </p>
          )}

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 font-sans text-white text-2xl leading-none"
                aria-label="前の写真"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-white text-2xl leading-none"
                aria-label="次の写真"
              >
                ›
              </button>
              <p className="absolute bottom-4 left-0 right-0 text-center font-sans text-xs text-white/40">
                {lightbox + 1} / {photos.length}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
