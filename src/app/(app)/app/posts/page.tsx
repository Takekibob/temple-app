import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostCard from "@/components/teralog/PostCard";

export default async function AppPostsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberId = authUser.member?.id ?? null;

  const followedTempleIds: string[] = memberId
    ? await prisma.memberFavoriteTemple
        .findMany({ where: { memberId }, select: { templeId: true } })
        .then((favs) => favs.map((f) => f.templeId))
    : [];

  const allTempleIds = Array.from(
    new Set([...(authUser.templeId ? [authUser.templeId] : []), ...followedTempleIds])
  );

  const posts =
    allTempleIds.length > 0
      ? await prisma.templePost.findMany({
          where: { templeId: { in: allTempleIds } },
          include: {
            photos: { orderBy: { order: "asc" } },
            temple: { select: { id: true, name: true, logoUrl: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 40,
        })
      : [];

  // フォロー中寺院を先頭に
  const followedSet = new Set(followedTempleIds);
  const sorted = [...posts].sort((a, b) => {
    const aF = followedSet.has(a.templeId) ? 0 : 1;
    const bF = followedSet.has(b.templeId) ? 0 : 1;
    return aF - bF || b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "0.5px solid #E5E5E5" }}>
        <h1 className="font-serif text-xl text-ink font-light">お寺の声</h1>
        <p className="font-serif text-[11px] text-ink-tertiary tracking-section mt-1">
          フォロー中のお寺からの日常
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-serif text-sm text-ink-tertiary font-light mb-4">
            まだ投稿がありません
          </p>
          <Link href="/app/temples" className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink">
            お寺をフォローする
          </Link>
        </div>
      ) : (
        <div className="px-6">
          {sorted.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                title: post.title,
                body: post.body,
                publishedAt: post.publishedAt,
                photos: post.photos,
                temple: post.temple,
              }}
              variant="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
