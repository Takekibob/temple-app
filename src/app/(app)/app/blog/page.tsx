import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

export default async function AppBlogPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const isSubscriber = await hasActiveSubscription(
    authUser.member.id,
    authUser.templeId
  );

  const posts = await prisma.blogPost.findMany({
    where: {
      templeId: authUser.templeId,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
      isSubscriberOnly: true,
      publishedAt: true,
      body: true,
    },
  });

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-stone-800">ブログ</h1>
        <p className="text-xs text-stone-500 mt-0.5">お寺からの記事・お便り</p>
      </div>

      {!isSubscriber && posts.some((p) => p.isSubscriberOnly) && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          会員限定の記事を読むには
          <Link href="/app/subscriptions" className="font-semibold underline ml-1">
            会員プランへの加入
          </Link>
          が必要です
        </div>
      )}

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          まだ記事がありません
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const locked = p.isSubscriberOnly && !isSubscriber;
            return (
              <div key={p.id} className={`bg-white rounded-xl border overflow-hidden ${locked ? "border-stone-100 opacity-70" : "border-stone-200"}`}>
                {p.coverImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.coverImageUrl} alt="" className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {p.isSubscriberOnly && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        会員限定
                      </span>
                    )}
                    <p className="text-xs text-stone-400">
                      {p.publishedAt?.toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <p className="font-medium text-stone-800">{p.title}</p>
                  {!locked && (
                    <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                      {p.body.slice(0, 80)}
                    </p>
                  )}
                  {locked ? (
                    <Link
                      href="/app/subscriptions"
                      className="mt-3 inline-block text-xs text-amber-700 hover:underline"
                    >
                      会員プランに加入して読む →
                    </Link>
                  ) : (
                    <Link
                      href={`/app/blog/${p.id}`}
                      className="mt-3 inline-block text-xs text-amber-700 hover:underline"
                    >
                      続きを読む →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
