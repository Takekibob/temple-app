import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TempleAvatar from "@/components/teralog/TempleAvatar";
import PhotoGallery from "@/components/teralog/PhotoGallery";

const KANJI_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function toKanjiDate(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
  const day = DAYS_JA[date.getDay()];

  const yStr = String(y)
    .split("")
    .map((c) => KANJI_DIGITS[parseInt(c)] ?? c)
    .join("");

  const mStr =
    m >= 10
      ? `${KANJI_DIGITS[Math.floor(m / 10)]}${m % 10 === 0 ? "" : KANJI_DIGITS[m % 10]}`
      : KANJI_DIGITS[m];

  const dStr =
    d >= 10
      ? `${KANJI_DIGITS[Math.floor(d / 10)]}${d % 10 === 0 ? "日" : KANJI_DIGITS[d % 10] + "日"}`
      : `${KANJI_DIGITS[d]}日`;

  return `${yStr}年 ${mStr}月 ${dStr} ${day}曜日`;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id } = await params;

  const post = await prisma.templePost.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { order: "asc" } },
      temple: { select: { id: true, name: true, denomination: true, logoUrl: true } },
    },
  });

  if (!post) notFound();

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ナビ */}
      <div className="px-6 pt-6 pb-4">
        <Link href="/app/posts" className="font-serif text-[11px] text-ink-tertiary tracking-section">
          ← お寺の声
        </Link>
      </div>

      {/* 寺院ヘッダー */}
      <div className="px-6 pb-5 flex items-center gap-3" style={{ borderBottom: "0.5px solid #E5E5E5" }}>
        <Link href={`/app/temples/${post.temple.id}`}>
          <TempleAvatar name={post.temple.name} imageUrl={post.temple.logoUrl ?? undefined} size="md" />
        </Link>
        <div>
          <Link href={`/app/temples/${post.temple.id}`}>
            <p className="font-serif text-base text-ink font-light">{post.temple.name}</p>
          </Link>
          {post.temple.denomination && (
            <p className="font-serif text-[11px] text-ink-tertiary tracking-section font-light">
              {post.temple.denomination}
            </p>
          )}
        </div>
      </div>

      {/* 本文 */}
      <article className="px-6 py-6">
        {/* 日付(漢数字) */}
        <time className="font-serif text-[11px] text-ink-tertiary tracking-section font-light block mb-5">
          {toKanjiDate(post.publishedAt)}
        </time>

        {/* タイトル */}
        {post.title && (
          <h1 className="font-serif text-[22px] text-ink font-medium leading-snug mb-6" style={{ letterSpacing: "0.05em" }}>
            {post.title}
          </h1>
        )}

        {/* 本文 */}
        <div
          className="font-serif text-base text-ink font-light"
          style={{ lineHeight: "2.2", letterSpacing: "0.02em" }}
        >
          {post.body.split("\n").map((line, i) => (
            <p key={i} className={line ? "" : "h-[1.5em]"}>
              {line}
            </p>
          ))}
        </div>
      </article>

      {/* 写真ギャラリー */}
      {post.photos.length > 0 && (
        <div className="px-6 pb-6">
          <p className="font-serif text-[11px] text-ink-tertiary tracking-section font-light mb-3">
            写 真
          </p>
          <PhotoGallery photos={post.photos} />
        </div>
      )}
    </div>
  );
}
