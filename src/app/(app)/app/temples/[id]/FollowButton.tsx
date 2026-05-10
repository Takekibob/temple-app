"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

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
      className={`flex items-center justify-center gap-2 w-full py-3.5 font-sans text-sm disabled:opacity-60 transition-colors ${
        following
          ? "bg-paper-soft text-ink-secondary border-[0.5px] border-border hover:bg-paper-cream"
          : "bg-paper text-ink border-[0.5px] border-border hover:bg-paper-soft"
      }`}
    >
      {following && <Check size={16} />}
      {following ? "フォロー中" : "このお寺をフォローする"}
    </button>
  );
}
