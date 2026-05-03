"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

interface Props {
  templeId: string;
  initialFollowing: boolean;
  redirectAfter?: string;
}

export default function FollowButton({ templeId, initialFollowing, redirectAfter }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      if (following) {
        await fetch(`/api/favorites/temples/${templeId}`, { method: "DELETE" });
        setFollowing(false);
      } else {
        await fetch("/api/favorites/temples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templeId }),
        });
        setFollowing(true);
        if (redirectAfter) {
          router.push(redirectAfter);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${
        following
          ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
          : "bg-white text-stone-700 border border-stone-200 hover:border-rose-300 hover:text-rose-500"
      }`}
    >
      <Heart size={16} className={following ? "fill-rose-500 text-rose-500" : ""} />
      {following ? "フォロー中" : "このお寺をフォローする"}
    </button>
  );
}
