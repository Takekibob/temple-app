"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

interface Props {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export default function BlogLikeButton({ postId, initialLiked, initialCount }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => (wasLiked ? c - 1 : c + 1));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/blog/${postId}/like`, {
          method: wasLiked ? "DELETE" : "POST",
        });
        const data = await res.json();
        if (res.ok) setCount(data.count);
        else {
          setLiked(wasLiked);
          setCount((c) => (wasLiked ? c + 1 : c - 1));
        }
      } catch {
        setLiked(wasLiked);
        setCount((c) => (wasLiked ? c + 1 : c - 1));
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
        liked
          ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
          : "bg-white border-stone-200 text-stone-500 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50"
      } disabled:opacity-60`}
      aria-label={liked ? "いいねを取り消す" : "いいねする"}
    >
      <Heart size={16} className={liked ? "fill-rose-500 text-rose-500" : ""} />
      <span>{liked ? "いいね済み" : "いいね"}</span>
      {count > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
          liked ? "bg-rose-100 text-rose-600" : "bg-stone-100 text-stone-500"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
