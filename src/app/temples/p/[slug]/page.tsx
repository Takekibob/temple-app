import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.templePage.findUnique({
    where: { slug, isPublished: true },
    include: { temple: { select: { name: true, description: true } } },
  });

  if (!page) return {};

  return {
    title: page.seoTitle ?? `${page.temple.name} | てらログ`,
    description: page.seoDescription ?? page.temple.description ?? undefined,
  };
}

const TEMPLATE_STYLES: Record<string, { bg: string; accent: string; header: string }> = {
  CLASSIC: { bg: "bg-amber-50", accent: "amber", header: "bg-amber-900" },
  MODERN: { bg: "bg-stone-50", accent: "stone", header: "bg-stone-900" },
  ZEN: { bg: "bg-white", accent: "stone", header: "bg-stone-800" },
  NATURE: { bg: "bg-green-50", accent: "green", header: "bg-green-900" },
};

export default async function TemplePublicPage({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.templePage.findUnique({
    where: { slug, isPublished: true },
    include: {
      temple: {
        select: {
          id: true,
          name: true,
          denomination: true,
          address: true,
          phone: true,
          email: true,
          description: true,
          logoUrl: true,
          coverImageUrl: true,
          events: {
            where: { status: "PUBLISHED", eventDate: { gte: new Date() } },
            orderBy: { eventDate: "asc" },
            take: 3,
            select: { id: true, title: true, eventDate: true, startTime: true, fee: true },
          },
        },
      },
    },
  });

  if (!page) notFound();

  const t = page.temple;
  const style = TEMPLATE_STYLES[page.template] ?? TEMPLATE_STYLES.CLASSIC;
  const customSections = Array.isArray(page.customSections)
    ? (page.customSections as Array<{ title: string; body: string }>)
    : [];

  return (
    <div className={`min-h-screen ${style.bg}`}>
      {/* ヘッダー */}
      <header className={`${style.header} text-white`}>
        {(page.heroImageUrl ?? t.coverImageUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.heroImageUrl ?? t.coverImageUrl ?? ""}
            alt={t.name}
            className="w-full h-64 object-cover opacity-60"
          />
        )}
        <div className="px-6 py-8 max-w-2xl mx-auto">
          {t.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.logoUrl} alt={t.name} className="w-16 h-16 object-contain mb-4 rounded-full bg-white p-1" />
          )}
          <h1 className="text-3xl font-bold">{t.name}</h1>
          {t.denomination && <p className="text-sm opacity-75 mt-1">{t.denomination}</p>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* 紹介文 */}
        {t.description && (
          <section>
            <p className="text-stone-700 leading-relaxed">{t.description}</p>
          </section>
        )}

        {/* 近日イベント */}
        {t.events.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-stone-800 mb-4">近日開催のイベント</h2>
            <div className="space-y-3">
              {t.events.map((e) => (
                <div key={e.id} className="bg-white rounded-xl border border-stone-200 p-4">
                  <p className="font-medium text-stone-800">{e.title}</p>
                  <p className="text-sm text-stone-500 mt-0.5">
                    {new Date(e.eventDate).toLocaleDateString("ja-JP", {
                      month: "long", day: "numeric", weekday: "short",
                    })} {e.startTime}〜
                    {e.fee > 0 && ` / ¥${e.fee.toLocaleString()}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* カスタムセクション */}
        {customSections.map((section, i) => (
          <section key={i}>
            <h2 className="text-xl font-bold text-stone-800 mb-3">{section.title}</h2>
            <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{section.body}</p>
          </section>
        ))}

        {/* 基本情報 */}
        <section className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-lg font-bold text-stone-800 mb-4">基本情報</h2>
          <dl className="space-y-2 text-sm">
            {t.address && (
              <div className="flex gap-3">
                <dt className="text-stone-400 w-16 shrink-0">所在地</dt>
                <dd className="text-stone-700">{t.address}</dd>
              </div>
            )}
            {t.phone && (
              <div className="flex gap-3">
                <dt className="text-stone-400 w-16 shrink-0">電話</dt>
                <dd className="text-stone-700">{t.phone}</dd>
              </div>
            )}
            {t.email && (
              <div className="flex gap-3">
                <dt className="text-stone-400 w-16 shrink-0">メール</dt>
                <dd className="text-stone-700">{t.email}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* 会員登録CTA */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-lg font-bold text-stone-800 mb-1">{t.name}の会員になる</p>
          <p className="text-sm text-stone-500 mb-5">
            法要・イベントのご案内をアプリで受け取れます
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-amber-700 text-white px-8 py-3 rounded-xl font-medium hover:bg-amber-800 transition-colors text-sm"
          >
            無料で会員登録する
          </Link>
          <p className="text-xs text-stone-400 mt-3">
            既にアカウントをお持ちの方は{" "}
            <Link href="/" className="text-amber-700 hover:underline">
              ログインはこちら
            </Link>
          </p>
        </section>

        {/* 寄付CTA */}
        <section className="text-center py-4">
          <Link
            href={`/donate/${t.id}`}
            className="inline-block bg-amber-700 text-white px-8 py-3 rounded-xl font-medium hover:bg-amber-800 transition-colors"
          >
            オンラインで寄付する
          </Link>
        </section>
      </main>
    </div>
  );
}
