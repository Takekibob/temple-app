import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";
import { Newspaper, Lock, ChevronRight, Calendar } from "lucide-react";

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
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">ブログ</h1>
        <p className="text-xs text-stone-400 mt-0.5">お寺からの記事・お便り</p>
      </div>

      <div className="px-4 space-y-4">
        {!isSubscriber && posts.some((p) => p.isSubscriberOnly) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              会員限定の記事を読むには
              <Link href="/app/subscriptions" className="font-semibold underline ml-1">
                会員プランへの加入
              </Link>
              が必要です
            </p>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Newspaper size={22} className="text-stone-400" />
            </div>
            <p className="text-stone-400 text-sm">まだ記事がありません</p>
          </div>
        ) : (
          posts.map((p) => {
            const locked = p.isSubscriberOnly && !isSubscriber;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  locked ? "border-stone-100 opacity-70" : "border-stone-100"
                }`}
              >
                {p.coverImageUrl && (
                  <div className="relative h-40 overflow-hidden bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.coverImageUrl} alt="" className="w-full h-full object-cover" />
                    {locked && (
                      <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                        <div className="bg-white/90 rounded-full p-2">
                          <Lock size={18} className="text-stone-600" />
                        </div>
                      </div>
                    )}
                    {p.isSubscriberOnly && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-amber-700/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                          <Lock size={10} />
                          会員限定
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  {!p.coverImageUrl && (
                    <div className="flex items-center gap-2 mb-2">
                      {p.isSubscriberOnly && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock size={9} />
                          会員限定
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-stone-400 flex items-center gap-1 mb-1.5">
                    <Calendar size={11} />
                    {p.publishedAt?.toLocaleDateString("ja-JP", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                  <p className="font-bold text-stone-800 leading-snug">{p.title}</p>
                  {!locked && (
                    <p className="text-sm text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {p.body.slice(0, 80)}
                    </p>
                  )}
                  {locked ? (
                    <Link
                      href="/app/subscriptions"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-amber-700 font-semibold hover:underline"
                    >
                      <Lock size={11} />
                      会員プランに加入して読む
                    </Link>
                  ) : (
                    <Link
                      href={`/app/blog/${p.id}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs text-amber-700 font-semibold hover:underline"
                    >
                      続きを読む
                      <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
