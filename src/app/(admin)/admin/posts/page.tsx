import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPostsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const posts = await prisma.templePost.findMany({
    where: { templeId: authUser.templeId },
    include: {
      photos: { orderBy: { order: "asc" }, take: 1 },
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6" style={{ borderBottom: "0.5px solid #E5E5E5", paddingBottom: "1.5rem" }}>
        <div>
          <h1 className="font-serif text-xl text-ink font-light">お寺の声</h1>
          <p className="font-serif text-[11px] text-ink-tertiary tracking-section mt-1">
            {posts.length} 件
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="bg-ink text-white font-serif font-light px-5 py-2.5 text-sm tracking-button"
        >
          新しく書く
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif text-sm text-ink-tertiary font-light mb-4">
            まだ投稿がありません
          </p>
          <Link href="/admin/posts/new" className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink">
            最初の投稿を書く
          </Link>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/posts/${post.id}/edit`}
              className="flex items-center gap-4 py-4"
              style={{ borderBottom: "0.5px solid #F0F0F0" }}
            >
              {/* サムネイル */}
              <div className="w-12 h-12 bg-paper-soft shrink-0 overflow-hidden">
                {post.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.photos[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-sans text-ink-tertiary text-xl">—</span>
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm text-ink font-light truncate">
                  {post.title ?? post.body.slice(0, 30) + (post.body.length > 30 ? "…" : "")}
                </p>
                <time className="font-sans text-[11px] text-ink-tertiary">
                  {post.publishedAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}
                </time>
                {post.photos.length > 0 && (
                  <span className="font-sans text-[10px] text-ink-tertiary ml-2">
                    写真 {post.photos.length > 1 ? "あり" : "1枚"}
                  </span>
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
