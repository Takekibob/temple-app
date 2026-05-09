import Link from "next/link";
import { getArticleCategoryLabel } from "@/lib/articleCategories";
import MountainHero from "./MountainHero";

export interface ArticleCardData {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  coverImage: string | null;
  publishedAt: Date | null;
  temple?: { id: string; name: string } | null;
  author?: { name: string } | null;
}

type Props = {
  article: ArticleCardData;
  variant?: "default" | "compact";
};

function formatPubDate(date: Date | null): string {
  if (!date) return "";
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
  return `${m}.${d} ${DAYS[date.getDay()]}`;
}

export default function ArticleCard({ article, variant = "default" }: Props) {
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/app/articles/${article.slug}`}
      className="block bg-paper border-b-[0.5px] border-border"
    >
      {/* ヒーロー画像 */}
      {!isCompact && (
        <div className="w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {article.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <MountainHero height={180} />
          )}
        </div>
      )}

      <div className={isCompact ? "py-3" : "py-4"}>
        {/* カテゴリ + 日付 */}
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-serif text-[10px] text-ink-tertiary tracking-section font-light">
            {getArticleCategoryLabel(article.category)}
          </span>
          <time className="font-sans text-[10px] text-ink-tertiary">
            {formatPubDate(article.publishedAt)}
          </time>
        </div>

        {/* タイトル */}
        <h3 className={`font-serif text-ink font-medium leading-snug mb-2 ${isCompact ? "text-[14px]" : "text-[17px]"}`}>
          {article.title}
        </h3>

        {/* 概要 */}
        {!isCompact && (
          <p className="font-serif text-sm text-ink-secondary font-light leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
        )}

        {/* 出典 */}
        {article.temple && (
          <p className="font-serif text-[10px] text-ink-tertiary tracking-section font-light mt-2">
            {article.temple.name}
          </p>
        )}
      </div>
    </Link>
  );
}
