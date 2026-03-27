import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id } = await params;
  const memberType = authUser.member?.type ?? null;

  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      templeId: authUser.templeId,
      publishedAt: { not: null, lte: new Date() },
    },
  });

  if (!announcement) notFound();

  // セグメントアクセスチェック
  const seg = announcement.targetSegment;
  if (seg === "DANKA" && memberType !== "DANKA") redirect("/app/news");
  if (seg === "GOEN" && memberType !== "GOEN") redirect("/app/news");

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link
        href="/app/news"
        className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block"
      >
        ← お知らせ一覧
      </Link>

      <article className="bg-white rounded-xl border border-stone-200 p-5">
        <p className="text-xs text-stone-400 mb-2">
          {announcement.publishedAt!.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-xl font-bold text-stone-800 leading-snug mb-4">
          {announcement.title}
        </h1>
        <div className="border-t border-stone-100 pt-4">
          <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
            {announcement.body}
          </p>
        </div>
      </article>
    </div>
  );
}
