import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminBlogPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const posts = await prisma.blogPost.findMany({
    where: { templeId: authUser.templeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">ブログ管理</h1>
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
        >
          ＋ 新規作成
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          記事がありません
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex gap-1.5 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "PUBLISHED"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {p.status === "PUBLISHED" ? "公開中" : "下書き"}
                  </span>
                  {p.isSubscriberOnly && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      会員限定
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-stone-800 truncate">{p.title}</p>
                <p className="text-xs text-stone-400 flex-shrink-0">
                  {p.publishedAt
                    ? p.publishedAt.toLocaleDateString("ja-JP")
                    : p.createdAt.toLocaleDateString("ja-JP")}
                </p>
              </div>
              <Link
                href={`/admin/blog/${p.id}/edit`}
                className="text-xs text-amber-700 hover:underline flex-shrink-0 ml-4"
              >
                編集 →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
