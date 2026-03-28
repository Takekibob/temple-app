"use client";

import { useState, useTransition } from "react";

export default function FavoriteButton({
  templeId,
  initialFavorite,
}: {
  templeId: string;
  initialFavorite: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      if (isFavorite) {
        await fetch(`/api/favorites/temples/${templeId}`, { method: "DELETE" });
        setIsFavorite(false);
      } else {
        await fetch("/api/favorites/temples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templeId }),
        });
        setIsFavorite(true);
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all ${
        isFavorite
          ? "border-amber-600 bg-amber-50 text-amber-700"
          : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
      }`}
    >
      <span>{isFavorite ? "♥" : "♡"}</span>
      {isFavorite ? "お気に入り登録済み" : "お気に入りに追加"}
    </button>
  );
}
