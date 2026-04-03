import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";
import { ChevronLeft, Lock, Calendar } from "lucide-react";

export default async function AppBlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const { id } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { id, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      body: true,
      coverImageUrl: true,
      isSubscriberOnly: true,
      publishedAt: true,
      templeId: true,
      temple: { select: { name: true } },
    },
  });
  if (!post) notFound();

  // フォロー中 or 所属寺院のみアクセス可
  const memberId = authUser.member.id;
  const myTempleId = authUser.templeId;
  const isOwnTemple = post.templeId === myTempleId;
  if (!isOwnTemple) {
    const fav = await prisma.memberFavoriteTemple.findFirst({
      where: { memberId, templeId: post.templeId },
    });
    if (!fav) notFound();
  }

  if (post.isSubscriberOnly) {
    const ok = await hasActiveSubscription(memberId, post.templeId);
    if (!ok) redirect("/app/subscriptions");
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* 戻るボタン */}
      <div className="px-5 pt-6 pb-2">
        <Link
          href="/app/blog"
          className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <ChevronLeft size={16} />
          ブログ
        </Link>
      </div>

      {post.coverImageUrl && (
        <div className="px-4 mt-2 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImageUrl}
            alt=""
            className="w-full h-48 object-cover rounded-2xl border border-stone-100 shadow-sm"
          />
        </div>
      )}

      <div className="px-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {post.isSubscriberOnly && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={9} />
                会員限定
              </span>
            )}
            <p className="text-xs text-stone-400 flex items-center gap-1">
              <Calendar size={11} />
              {post.publishedAt?.toLocaleDateString("ja-JP", {
                year: "numeric", month: "long", day: "numeric",
              })}
              {!isOwnTemple && (
                <span className="ml-1">· {post.temple.name}</span>
              )}
            </p>
          </div>

          <h1 className="text-xl font-bold text-stone-800 leading-snug mb-4">{post.title}</h1>

          <div className="border-t border-stone-100 pt-4">
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {post.body}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
