import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";
import { Newspaper, Lock, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Suspense } from "react";
import SearchBar from "@/components/app/SearchBar";

export default async function AppBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const { search } = await searchParams;

  const favoriteTempleIds = (
    await prisma.memberFavoriteTemple.findMany({
      where: { memberId: authUser.member.id },
      select: { templeId: true },
    })
  ).map((f) => f.templeId);

  const myTempleId = authUser.templeId;
  const relevantTempleIds = Array.from(
    new Set([myTempleId, ...favoriteTempleIds].filter(Boolean))
  );

  const searchFilter = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { body: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const posts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      templeId: { in: relevantTempleIds },
      ...searchFilter,
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
      isSubscriberOnly: true,
      publishedAt: true,
      body: true,
      templeId: true,
      temple: { select: { name: true } },
      _count: { select: { likes: true } },
    },
  });

  const isSubscriberByTemple: Record<string, boolean> = {};
  for (const tid of relevantTempleIds) {
    isSubscriberByTemple[tid] = await hasActiveSubscription(authUser.member.id, tid);
  }

  const myTemplePosts = posts.filter((p) => p.templeId === myTempleId);
  const followedPosts = posts.filter((p) => p.templeId !== myTempleId);

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">ブログ</h1>
        <p className="text-xs text-stone-400 mt-0.5">お寺からの記事・お便り</p>
      </div>

      {/* 検索バー */}
      <div className="px-4 pb-4">
        <Suspense>
          <SearchBar placeholder="記事を検索…" />
        </Suspense>
      </div>

      <div className="px-4 space-y-4">
        {posts.some((p) => p.isSubscriberOnly && !isSubscriberByTemple[p.templeId]) && (
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
            <p className="text-stone-400 text-sm">
              {search ? "検索結果がありません" : "まだ記事がありません"}
            </p>
          </div>
        ) : (
          <>
            {myTemplePosts.length > 0 && followedPosts.length > 0 && (
              <SectionLabel>所属のお寺</SectionLabel>
            )}
            {myTemplePosts.map((p) => (
              <PostCard key={p.id} post={p} locked={p.isSubscriberOnly && !isSubscriberByTemple[p.templeId]} />
            ))}

            {followedPosts.length > 0 && (
              <>
                {myTemplePosts.length > 0 && <SectionLabel>フォロー中のお寺</SectionLabel>}
                {followedPosts.map((p) => (
                  <PostCard key={p.id} post={p} locked={p.isSubscriberOnly && !isSubscriberByTemple[p.templeId]} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="h-px flex-1 bg-stone-100" />
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="h-px flex-1 bg-stone-100" />
    </div>
  );
}

type PostRow = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  isSubscriberOnly: boolean;
  publishedAt: Date | null;
  body: string;
  templeId: string;
  temple: { name: string };
  _count: { likes: number };
};

function PostCard({
  post: p,
  locked,
}: {
  post: PostRow;
  locked: boolean;
}) {
  return (
    <div
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
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-white/90 backdrop-blur-sm text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <MapPin size={10} />
              {p.temple.name}
            </span>
            {p.isSubscriberOnly && (
              <span className="bg-amber-700/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Lock size={10} />
                会員限定
              </span>
            )}
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {!p.coverImageUrl && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full">
              <MapPin size={10} />
              {p.temple.name}
            </span>
          )}
          {p.isSubscriberOnly && !p.coverImageUrl && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock size={9} />
              会員限定
            </span>
          )}
        </div>
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
        <div className="mt-3 flex items-center justify-between">
          {locked ? (
            <Link
              href="/app/subscriptions"
              className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold hover:underline"
            >
              <Lock size={11} />
              会員プランに加入して読む
            </Link>
          ) : (
            <Link
              href={`/app/blog/${p.id}`}
              className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold hover:underline"
            >
              続きを読む
              <ChevronRight size={12} />
            </Link>
          )}
          {p._count.likes > 0 && (
            <span className="text-xs text-stone-400 flex items-center gap-1">
              ♥ {p._count.likes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
