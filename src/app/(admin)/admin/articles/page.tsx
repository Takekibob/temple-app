import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ARTICLE_CATEGORIES, getArticleCategoryLabel } from "@/lib/articleCategories";

export default async function AdminArticlesPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const isSuperAdmin = authUser.role === "SUPER_ADMIN";

  const articles = await prisma.article.findMany({
    where: isSuperAdmin ? {} : { templeId: authUser.templeId },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      publishedAt: true,
      coverImage: true,
      temple: isSuperAdmin ? { select: { name: true } } : false,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const STATUS_LABEL: Record<string, string> = {
    PUBLISHED: "公開",
    DRAFT: "下書き",
    ARCHIVED: "非公開",
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6" style={{ borderBottom: "0.5px solid #E5E5E5", paddingBottom: "1.5rem" }}>
        <div>
          <h1 className="font-serif text-xl text-ink font-light">学びの記事</h1>
          <p className="font-serif text-[11px] text-ink-tertiary tracking-section mt-1">
            {articles.length} 件
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="bg-ink text-white font-serif font-light px-5 py-2.5 text-sm tracking-button"
        >
          新しく書く
        </Link>
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
        {ARTICLE_CATEGORIES.map((c) => {
          const count = articles.filter((a) => a.category === c.value).length;
          return (
            <span
              key={c.value}
              className="font-serif text-[11px] text-ink-tertiary tracking-section whitespace-nowrap"
            >
              {c.label}（{count}）
            </span>
          );
        })}
      </div>

      {articles.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif text-sm text-ink-tertiary font-light mb-4">
            まだ記事がありません
          </p>
          <Link href="/admin/articles/new" className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink">
            最初の記事を書く
          </Link>
        </div>
      ) : (
        <div>
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/admin/articles/${article.id}/edit`}
              className="flex items-center gap-4 py-4"
              style={{ borderBottom: "0.5px solid #F0F0F0" }}
            >
              {/* サムネイル */}
              <div className="w-14 h-14 bg-paper-soft shrink-0 overflow-hidden">
                {article.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-sans text-ink-tertiary text-xl">—</span>
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-serif text-[10px] text-ink-tertiary tracking-section">
                    {getArticleCategoryLabel(article.category)}
                  </span>
                  <span
                    className={`font-sans text-[10px] px-1.5 py-0.5 ${
                      article.status === "PUBLISHED"
                        ? "bg-ink text-white"
                        : article.status === "DRAFT"
                        ? "bg-paper-soft text-ink-tertiary border-[0.5px] border-border"
                        : "bg-paper-soft text-ink-tertiary"
                    }`}
                  >
                    {STATUS_LABEL[article.status] ?? article.status}
                  </span>
                  {isSuperAdmin && "temple" in article && article.temple && (
                    <span className="font-serif text-[10px] text-ink-tertiary">
                      {article.temple.name}
                    </span>
                  )}
                </div>
                <p className="font-serif text-sm text-ink font-light truncate">
                  {article.title}
                </p>
                {article.publishedAt && (
                  <time className="font-sans text-[11px] text-ink-tertiary">
                    {article.publishedAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}
                  </time>
                )}
              </div>

              <span className="font-sans text-ink-tertiary text-sm shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
