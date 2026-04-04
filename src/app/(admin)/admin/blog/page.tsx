import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PenLine, Plus, ChevronRight, Lock } from "lucide-react";

export default async function AdminBlogPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const posts = await prisma.blogPost.findMany({
    where: { templeId: authUser.templeId },
    orderBy: { createdAt: "desc" },
  });

  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const draftCount = posts.filter((p) => p.status !== "PUBLISHED").length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">ブログ管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            公開中 {publishedCount} 件　下書き {draftCount} 件
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
        >
          <Plus size={14} />
          新規作成
        </Link>
      </div>

      {/* リスト */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-14 text-center">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <PenLine size={24} className="text-stone-300" />
          </div>
          <p className="text-stone-400 text-sm mb-4">記事がありません</p>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
          >
            <Plus size={14} />
            最初の記事を書く
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/admin/blog/${p.id}/edit`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4 hover:border-amber-200 hover:shadow-md transition-all"
            >
              {/* アイコン */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                p.status === "PUBLISHED" ? "bg-amber-50" : "bg-stone-100"
              }`}>
                <PenLine size={15} className={p.status === "PUBLISHED" ? "text-amber-600" : "text-stone-400"} />
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  {p.status === "PUBLISHED" ? (
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      公開中
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                      下書き
                    </span>
                  )}
                  {p.isSubscriberOnly && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Lock size={10} />
                      会員限定
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-stone-800 truncate">{p.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {p.publishedAt
                    ? `公開: ${p.publishedAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}`
                    : `更新: ${p.createdAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}`}
                </p>
              </div>

              <ChevronRight size={16} className="text-stone-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
