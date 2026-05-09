import Link from "next/link";
import TempleAvatar from "./TempleAvatar";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function formatDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = DAYS[date.getDay()];
  return `${m}.${d} ${day}`;
}

export interface PostCardData {
  id: string;
  title: string | null;
  body: string;
  publishedAt: Date;
  photos: Array<{ url: string; caption?: string | null }>;
  temple: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
}

type Props = {
  post: PostCardData;
  variant?: "home" | "list" | "temple-detail";
};

export default function PostCard({ post, variant = "list" }: Props) {
  const isHome = variant === "home";
  const preview = post.body.length > 80 ? post.body.slice(0, 80) + "…" : post.body;
  const firstPhoto = post.photos[0];

  return (
    <Link
      href={`/app/posts/${post.id}`}
      className="block bg-paper border-b-[0.5px] border-border py-5"
    >
      {/* 寺院 + 日付 */}
      <div className="flex items-center gap-2 mb-3">
        <TempleAvatar name={post.temple.name} imageUrl={post.temple.logoUrl ?? undefined} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[12px] text-ink font-light truncate">{post.temple.name}</p>
          <time className="font-sans text-[11px] text-ink-tertiary">{formatDate(post.publishedAt)}</time>
        </div>
      </div>

      {/* 写真サムネイル (home/list で表示) */}
      {firstPhoto && !isHome && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={firstPhoto.url}
          alt={firstPhoto.caption ?? post.title ?? ""}
          className="w-full h-40 object-cover mb-3"
          style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
        />
      )}

      {/* タイトル */}
      {post.title && (
        <h3 className="font-serif text-[15px] text-ink font-medium leading-snug mb-1">
          {post.title}
        </h3>
      )}

      {/* 本文プレビュー */}
      <p className="font-serif text-sm text-ink-secondary font-light leading-relaxed">
        {preview}
      </p>

      {/* 写真枚数バッジ */}
      {post.photos.length > 1 && (
        <p className="font-sans text-[11px] text-ink-tertiary mt-2">
          + {post.photos.length} 枚
        </p>
      )}
    </Link>
  );
}
