import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NotesClient from "./NotesClient";
import { logFeature } from "@/lib/featureLog";
import {
  ChevronLeft, Pencil, GitBranch, Phone, MapPin, CalendarDays,
  BookOpen, Coins, Heart, MessageCircle, CheckCircle2, XCircle,
} from "lucide-react";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;
  void logFeature(authUser.templeId, authUser.id, "member_detail", "view");

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
      gojikaiPayments: {
        orderBy: { fiscalYear: "desc" },
        take: 5,
        select: { id: true, fiscalYear: true, amount: true, status: true, paidAt: true },
      },
      memberNotes: {
        include: { author: { select: { name: true } } },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!member) notFound();

  const interestTags = Array.isArray(member.interestTags) ? (member.interestTags as string[]) : [];
  const isDanka = member.type === "DANKA";

  const serializedNotes = member.memberNotes.map((n) => ({
    ...n,
    followupDate: n.followupDate ? n.followupDate.toISOString().slice(0, 10) : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  const TAG_COLORS: Record<string, string> = {
    要フォロー: "bg-amber-100 text-amber-800",
    要注意: "bg-red-100 text-red-700",
    VIP: "bg-green-100 text-green-800",
    体調注意: "bg-orange-100 text-orange-700",
    遠方: "bg-blue-100 text-blue-700",
    一人暮らし: "bg-purple-100 text-purple-700",
    跡継ぎ不在: "bg-stone-100 text-stone-600",
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* パンくず + ヘッダー */}
      <div className="mb-5">
        <Link href="/admin/members" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-3 transition-colors">
          <ChevronLeft size={14} />会員一覧
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* アバター */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 ${
              isDanka
                ? "bg-gradient-to-br from-amber-600 to-amber-800"
                : "bg-gradient-to-br from-teal-500 to-teal-700"
            }`}>
              {member.user.name.charAt(0)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-stone-800">{member.user.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isDanka ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                }`}>
                  {isDanka ? "檀家" : "ご縁さん"}
                </span>
              </div>
              {member.familyName && (
                <p className="text-sm text-stone-500 mt-0.5 truncate">{member.familyName}家・{member.user.email}</p>
              )}
            </div>
          </div>

          {/* アクション */}
          <div className="flex gap-2 shrink-0">
            {isDanka && (
              <Link href={`/admin/members/${id}/family-tree`}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 text-stone-600 text-sm rounded-xl hover:bg-stone-50 transition-colors">
                <GitBranch size={14} />家系図
              </Link>
            )}
            <Link href={`/admin/members/${id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium">
              <Pencil size={14} />編集
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左カラム */}
        <div className="lg:col-span-2 space-y-4">
          {/* 基本情報 */}
          <Card title="基本情報">
            <div className="space-y-3">
              {member.user.phone || member.phone ? (
                <Row icon={<Phone size={14} className="text-stone-400" />} label="電話番号"
                  value={<a href={`tel:${member.user.phone ?? member.phone}`} className="text-amber-700 hover:underline">{member.user.phone ?? member.phone}</a>} />
              ) : null}
              {member.address && (
                <Row icon={<MapPin size={14} className="text-stone-400" />} label="住所" value={member.address} />
              )}
              <Row icon={<CalendarDays size={14} className="text-stone-400" />} label="登録日"
                value={member.joinedDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} />
              {member.notes && (
                <div className="pt-2 border-t border-stone-50">
                  <p className="text-xs text-stone-400 mb-1">備考</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{member.notes}</p>
                </div>
              )}
            </div>
            {(member.priorityTags.length > 0 || member.summaryNote) && (
              <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                {member.priorityTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {member.priorityTags.map((tag) => (
                      <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TAG_COLORS[tag] ?? "bg-stone-100 text-stone-600"}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {member.summaryNote && (
                  <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 rounded-xl p-3">{member.summaryNote}</p>
                )}
              </div>
            )}
          </Card>

          {/* 過去帳（檀家） */}
          {isDanka && (
            <Card
              title={`過去帳（${member.deceasedPersons.length}件）`}
              icon={<BookOpen size={14} className="text-stone-500" />}
              action={<Link href={`/admin/deceased?memberId=${id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium">すべて見る →</Link>}
            >
              {member.deceasedPersons.length === 0 ? (
                <p className="text-sm text-stone-400">登録なし</p>
              ) : (
                <div className="space-y-2">
                  {member.deceasedPersons.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-stone-50 last:border-0">
                      <span className="text-sm font-medium text-stone-800">{p.name}</span>
                      <span className="text-xs text-stone-400">
                        {p.deathDate ? p.deathDate.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 護持会費（檀家） */}
          {isDanka && (
            <Card
              title="護持会費"
              icon={<Coins size={14} className="text-stone-500" />}
              action={<Link href="/admin/gojikai" className="text-xs text-amber-700 hover:text-amber-900 font-medium">一覧へ →</Link>}
            >
              {member.gojikaiPayments.length === 0 ? (
                <p className="text-sm text-stone-400">支払い記録なし</p>
              ) : (
                <div className="space-y-2">
                  {member.gojikaiPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0">
                      <span className="text-sm font-semibold text-stone-800">{p.fiscalYear}年度</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-stone-700">¥{p.amount.toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === "PAID" ? "bg-teal-100 text-teal-800" :
                          p.status === "EXEMPT" ? "bg-stone-100 text-stone-500" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {p.status === "PAID" ? "納付済" : p.status === "EXEMPT" ? "免除" : "未納"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* 興味・関心（ご縁さん） */}
          {!isDanka && interestTags.length > 0 && (
            <Card title="興味・関心" icon={<Heart size={14} className="text-stone-500" />}>
              <div className="flex flex-wrap gap-2">
                {interestTags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium border border-teal-100">
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* メモ・対応履歴 */}
          <Card
            title={`メモ・対応履歴（${member.memberNotes.length}件）`}
            icon={<BookOpen size={14} className="text-stone-500" />}
          >
            <NotesClient memberId={id} initialNotes={serializedNotes} />
          </Card>

          {/* イベント参加履歴 */}
          {member.eventParticipations.length > 0 && (
            <Card
              title={`イベント参加履歴（${member.eventParticipations.length}件）`}
              icon={<CalendarDays size={14} className="text-stone-500" />}
            >
              <div className="space-y-2">
                {member.eventParticipations.map((ep) => (
                  <div key={ep.id} className="flex justify-between items-center py-1.5 border-b border-stone-50 last:border-0">
                    <span className="text-sm text-stone-800">{ep.event.title}</span>
                    <span className="text-xs text-stone-400 shrink-0 ml-2">
                      {ep.event.eventDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* 右カラム */}
        <div className="space-y-4">
          {/* LINE連携 */}
          <Card title="LINE連携" icon={<MessageCircle size={14} className="text-stone-500" />}>
            <div className="flex items-center gap-2 mb-2">
              {member.lineUserId ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : (
                <XCircle size={16} className="text-stone-300" />
              )}
              <span className={`text-sm font-semibold ${member.lineUserId ? "text-green-700" : "text-stone-400"}`}>
                {member.lineUserId ? "連携済み" : "未連携"}
              </span>
            </div>
            {member.lineUserId && (
              <div className="space-y-1.5 mt-2">
                {[
                  { label: "予約通知", value: member.notifyReservation },
                  { label: "イベント通知", value: member.notifyEvent },
                  { label: "命日通知", value: member.notifyAnniversary },
                  { label: "お知らせ通知", value: member.notifyAnnouncement },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-stone-500">{label}</span>
                    <span className={value ? "text-teal-600 font-semibold" : "text-stone-300"}>
                      {value ? "ON" : "OFF"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!member.lineUserId && member.lineCode && member.lineCodeExpiresAt && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg p-2">
                連携コード有効期限: {member.lineCodeExpiresAt.toLocaleDateString("ja-JP")}
              </p>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}

function Card({
  title, icon, action, children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <h2 className="font-semibold text-stone-800 text-sm">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-400">{label}</p>
        <p className="text-sm text-stone-800">{value}</p>
      </div>
    </div>
  );
}
