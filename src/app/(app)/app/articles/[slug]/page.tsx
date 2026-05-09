import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ArticleRenderer from "@/components/teralog/ArticleRenderer";
import ArticleCard, { type ArticleCardData } from "@/components/teralog/ArticleCard";
import { getArticleCategoryLabel } from "@/lib/articleCategories";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, excerpt: true, coverImage: true },
  });
  if (!article) return {};

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app";

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: `${baseUrl}/app/articles/${slug}`,
      type: "article",
      ...(article.coverImage ? { images: [{ url: article.coverImage }] } : {}),
    },
    twitter: {
      card: article.coverImage ? "summary_large_image" : "summary",
      title: article.title,
      description: article.excerpt,
      ...(article.coverImage ? { images: [article.coverImage] } : {}),
    },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { select: { name: true } },
      temple: { select: { id: true, name: true } },
    },
  });

  if (!article) notFound();

  const related = await prisma.article.findMany({
    where: { category: article.category, status: "PUBLISHED", id: { not: article.id } },
    select: {
      slug: true, title: true, excerpt: true, category: true,
      coverImage: true, publishedAt: true,
      temple: { select: { id: true, name: true } },
      author: { select: { name: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const pubDate = article.publishedAt;
  const dateStr = pubDate
    ? pubDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-6 pb-4">
        <Link href="/app/articles" className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-4">
          ← 学びの記事
        </Link>
      </div>

      {/* カバー画像 */}
      {article.coverImage && (
        <div className="w-full overflow-hidden mb-6" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.coverImage} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-5">
        {/* カテゴリ + 日付 */}
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-serif text-[11px] text-ink-tertiary tracking-section font-light">
            {getArticleCategoryLabel(article.category)}
          </span>
          {dateStr && (
            <time className="font-sans text-[11px] text-ink-tertiary">{dateStr}</time>
          )}
        </div>

        {/* タイトル */}
        <h1 className="font-serif text-2xl text-ink font-medium leading-snug mb-4" style={{ letterSpacing: "0.05em" }}>
          {article.title}
        </h1>

        {/* 概要 */}
        <p className="font-serif text-sm text-ink-secondary font-light mb-8" style={{ lineHeight: "2" }}>
          {article.excerpt}
        </p>

        {/* 仕切り */}
        <hr style={{ border: "none", borderTop: "0.5px solid var(--color-border)", marginBottom: "2rem" }} />

        {/* 本文 */}
        <ArticleRenderer content={article.body} />

        {/* 著者 / 出典 */}
        {(article.author || article.temple) && (
          <div className="mt-10 pt-4" style={{ borderTop: "0.5px solid var(--color-border)" }}>
            {article.temple && (
              <p className="font-serif text-[11px] text-ink-tertiary tracking-section font-light">
                {article.temple.name}
              </p>
            )}
            {article.author && (
              <p className="font-serif text-[11px] text-ink-tertiary tracking-section font-light mt-0.5">
                著：{article.author.name}
              </p>
            )}
          </div>
        )}

        {/* 関連記事 */}
        {related.length > 0 && (
          <div className="mt-12">
            <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-5">関 連 記 事</p>
            <div className="space-y-5">
              {related.map((r) => (
                <ArticleCard
                  key={r.slug}
                  article={r as ArticleCardData}
                  variant="compact"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
