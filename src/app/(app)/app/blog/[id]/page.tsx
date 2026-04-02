import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

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
    where: { id, templeId: authUser.templeId, status: "PUBLISHED" },
  });
  if (!post) notFound();

  if (post.isSubscriberOnly) {
    const ok = await hasActiveSubscription(authUser.member.id, authUser.templeId);
    if (!ok) redirect("/app/subscriptions");
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link href="/app/blog" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← ブログ
      </Link>

      {post.coverImageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.coverImageUrl}
          alt=""
          className="w-full h-48 object-cover rounded-xl mb-4 border border-stone-200"
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        {post.isSubscriberOnly && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            会員限定
          </span>
        )}
        <p className="text-xs text-stone-400">
          {post.publishedAt?.toLocaleDateString("ja-JP")}
        </p>
      </div>

      <h1 className="text-xl font-bold text-stone-800 mb-4">{post.title}</h1>

      <div className="prose prose-stone prose-sm max-w-none">
        <p className="text-stone-700 whitespace-pre-wrap leading-relaxed text-sm">
          {post.body}
        </p>
      </div>
    </div>
  );
}
