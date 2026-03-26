import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PromoteButton from "./PromoteButton";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const member = await prisma.member.findFirst({
    where: { id, templeId: authUser.templeId },
    include: {
      user: { select: { name: true, email: true, phone: true, createdAt: true } },
      deceasedPersons: { orderBy: { deathDate: "desc" } },
      eventParticipations: {
        include: { event: { select: { title: true, eventDate: true, category: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      interactions: { orderBy: { createdAt: "desc" }, take: 20 },
      gojikaiPayments: { orderBy: { createdAt: "desc" }, take: 5 },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!member) notFound();

  const interestTags = Array.isArray(member.interestTags) ? (member.interestTags as string[]) : [];
  const isDanka = member.type === "DANKA";

  // 転換候補: ご縁さんでスコア70以上
  const isConversionCandidate = !isDanka && member.engagementScore >= 70;

  const ACTIVITY_LABELS: Record<string, string> = {
    LOGIN: "ログイン",
    NEWS_VIEW: "お知らせ閲覧",
    EVENT_APPLY: "イベント申込",
    EVENT_ATTEND: "イベント参加",
    EVENT_FEEDBACK: "フィードバック",
    KUYO_APPLY: "法要予約",
    CONTACT: "問い合わせ",
    CONSECUTIVE_MONTH: "連続月アクティブ",
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/admin/members" className="text-sm text-stone-400 hover:text-stone-600 mb-2 inline-block">
            ← 会員一覧
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-lg">
              {member.user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-800">{member.user.name}</h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isDanka ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                  }`}
                >
                  {isDanka ? "檀家" : "ご縁さん"}
                </span>
                {isConversionCandidate && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                    転換候補
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500">{member.user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isConversionCandidate && (
            <PromoteButton memberId={id} memberName={member.user.name} />
          )}
          <Link
            href={`/admin/members/${id}/edit`}
            className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
          >
            編集
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左カラム: 基本情報 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 基本情報 */}
          <section className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="font-semibold text-stone-800 mb-3">基本情報</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-stone-400">家名</dt>
              <dd className="text-stone-800">{member.familyName}</dd>
              <dt className="text-stone-400">電話番号</dt>
              <dd className="text-stone-800">{member.user.phone ?? member.phone ?? "—"}</dd>
              <dt className="text-stone-400">住所</dt>
              <dd className="text-stone-800">{member.address ?? "—"}</dd>
              <dt className="text-stone-400">登録日</dt>
              <dd className="text-stone-800">{member.joinedDate.toLocaleDateString("ja-JP")}</dd>
              {member.notes && (
                <>
                  <dt className="text-stone-400">備考</dt>
                  <dd className="text-stone-800">{member.notes}</dd>
                </>
              )}
            </dl>
          </section>

          {/* 檀家専用: 過去帳 */}
          {isDanka && (
            <section className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-stone-800">過去帳（{member.deceasedPersons.length}件）</h2>
                <Link href={`/admin/deceased?memberId=${id}`} className="text-xs text-amber-700">
                  過去帳を見る →
                </Link>
              </div>
              {member.deceasedPersons.length === 0 ? (
                <p className="text-sm text-stone-400">登録なし</p>
              ) : (
                <ul className="space-y-2">
                  {member.deceasedPersons.slice(0, 3).map((p) => (
                    <li key={p.id} className="text-sm flex justify-between">
                      <span className="text-stone-800">{p.name}</span>
                      <span className="text-stone-400">
                        {p.deathDate ? p.deathDate.toLocaleDateString("ja-JP") : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* 檀家専用: 護持会費 */}
          {isDanka && (
            <section className="bg-white rounded-xl border border-stone-200 p-4">
              <h2 className="font-semibold text-stone-800 mb-3">護持会費</h2>
              {member.gojikaiPayments.length === 0 ? (
                <p className="text-sm text-stone-400">支払い記録なし</p>
              ) : (
                <ul className="space-y-2">
                  {member.gojikaiPayments.map((p) => (
                    <li key={p.id} className="text-sm flex justify-between">
                      <span className="text-stone-800">
                        {p.createdAt.toLocaleDateString("ja-JP")}
                      </span>
                      <span className="text-stone-600">¥{p.amount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* ご縁さん専用: 興味タグ + スコア */}
          {!isDanka && (
            <section className="bg-white rounded-xl border border-stone-200 p-4">
              <h2 className="font-semibold text-stone-800 mb-3">興味・関心</h2>
              {interestTags.length === 0 ? (
                <p className="text-sm text-stone-400">タグなし</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {interestTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* イベント参加履歴 */}
          <section className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="font-semibold text-stone-800 mb-3">
              イベント参加履歴（{member.eventParticipations.length}件）
            </h2>
            {member.eventParticipations.length === 0 ? (
              <p className="text-sm text-stone-400">参加記録なし</p>
            ) : (
              <ul className="space-y-2">
                {member.eventParticipations.map((ep) => (
                  <li key={ep.id} className="text-sm flex justify-between items-center">
                    <span className="text-stone-800">{ep.event.title}</span>
                    <span className="text-stone-400">
                      {ep.event.eventDate.toLocaleDateString("ja-JP")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* 右カラム: エンゲージメント + 対応履歴 */}
        <div className="space-y-4">
          {/* エンゲージメントスコア */}
          <section className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-xs text-stone-400 mb-1">エンゲージメントスコア</p>
            <p className="text-4xl font-bold text-amber-700">{member.engagementScore}</p>
            <div className="mt-2 h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(100, member.engagementScore)}%` }}
              />
            </div>
          </section>

          {/* アクティビティログ */}
          <section className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="font-semibold text-stone-800 mb-3">アクティビティ</h2>
            {member.activities.length === 0 ? (
              <p className="text-sm text-stone-400">記録なし</p>
            ) : (
              <ul className="space-y-2">
                {member.activities.map((a) => (
                  <li key={a.id} className="text-xs flex justify-between items-center">
                    <span className="text-stone-600">{ACTIVITY_LABELS[a.type] ?? a.type}</span>
                    <div className="text-right">
                      <span className="text-amber-700 font-medium">+{a.score}pt</span>
                      <p className="text-stone-300">{a.createdAt.toLocaleDateString("ja-JP")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 対応履歴 */}
          <section className="bg-white rounded-xl border border-stone-200 p-4">
            <h2 className="font-semibold text-stone-800 mb-3">対応履歴</h2>
            {member.interactions.length === 0 ? (
              <p className="text-sm text-stone-400">記録なし</p>
            ) : (
              <ul className="space-y-3">
                {member.interactions.map((i) => (
                  <li key={i.id} className="text-sm border-l-2 border-stone-200 pl-2">
                    <p className="text-stone-800">{i.staffNote}</p>
                    {i.category && (
                      <p className="text-xs text-stone-400 mt-0.5">{i.category}</p>
                    )}
                    <p className="text-xs text-stone-300 mt-0.5">
                      {i.createdAt.toLocaleDateString("ja-JP")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
