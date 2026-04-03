import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Gift, Heart, Calendar, MapPin, ChevronRight } from "lucide-react";

const PURPOSE_LABELS: Record<string, string> = {
  GENERAL: "一般寄付",
  REPAIR: "修繕",
  CEREMONY: "法要",
  CROWDFUNDING: "クラウドファンディング",
  OTHER: "その他",
};

export default async function DonationsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const isAdminOrStaff = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

  // フォロー中のお寺ID
  const followedTempleIds = (
    await prisma.memberFavoriteTemple.findMany({
      where: { memberId: authUser.member.id },
      select: { templeId: true },
    })
  ).map((f) => f.templeId);

  const allTempleIds = Array.from(
    new Set([...(authUser.templeId ? [authUser.templeId] : []), ...followedTempleIds])
  );

  const [temples, donations] = await Promise.all([
    prisma.temple.findMany({
      where: { id: { in: allTempleIds }, isActive: true, stripeConnectOnboarded: true },
      select: {
        id: true, name: true, denomination: true, logoUrl: true, address: true,
      },
    }),
    prisma.donation.findMany({
      where: { memberId: authUser.member.id },
      include: { temple: { select: { name: true } } },
      orderBy: { donatedAt: "desc" },
    }),
  ]);

  const total = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">寄付</h1>
        <p className="text-xs text-stone-400 mt-0.5">お寺の活動を支援する</p>
      </div>

      <div className="px-4 space-y-5">
        {/* 管理者制限 */}
        {isAdminOrStaff && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 text-center">
            管理者・スタッフはこの機能を利用できません
          </div>
        )}

        {/* お寺一覧 */}
        {!isAdminOrStaff && (
          <section>
            <h2 className="text-sm font-bold text-stone-700 mb-3">寄付できるお寺</h2>
            {temples.length === 0 ? (
              <div className="bg-white border border-stone-100 rounded-2xl p-6 text-center shadow-sm space-y-3">
                <p className="text-stone-400 text-sm">オンライン寄付に対応しているお寺がありません</p>
                <Link
                  href="/app/temples"
                  className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold hover:underline"
                >
                  <MapPin size={12} />
                  お寺を探す
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {temples.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-4">
                      {t.logoUrl ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-stone-100 shrink-0">
                          <Image src={t.logoUrl} alt={t.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0">
                          🏯
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-800 text-sm leading-snug">{t.name}</p>
                        {t.denomination && (
                          <p className="text-xs text-amber-700 font-medium mt-0.5">{t.denomination}</p>
                        )}
                        {t.address && (
                          <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={10} />
                            {t.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-stone-50 px-4 pb-4 pt-3">
                      <Link
                        href={`/app/donations/new?templeId=${t.id}`}
                        className="flex items-center justify-center gap-2 w-full bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold py-3 rounded-xl transition-colors shadow-sm"
                      >
                        <Gift size={15} />
                        {t.name}に寄付する
                        <ChevronRight size={14} className="ml-auto" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 累計カード */}
        {donations.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-5 text-white shadow-md">
            <p className="text-xs font-semibold text-purple-200 uppercase tracking-widest mb-1">累計寄付額</p>
            <p className="text-3xl font-bold flex items-end gap-2">
              ¥{total.toLocaleString()}
              <Heart size={20} className="text-purple-300 mb-1" />
            </p>
          </div>
        )}

        {/* 履歴リスト */}
        <section>
          <h2 className="text-sm font-bold text-stone-700 mb-3">寄付履歴</h2>
          {donations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Gift size={22} className="text-purple-400" />
              </div>
              <p className="text-stone-400 text-sm">寄付履歴がありません</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {donations.map((d) => (
                <div key={d.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                      <Gift size={15} className="text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-700">
                        {PURPOSE_LABELS[d.purpose] ?? d.purpose}
                        {d.purposeDetail && <span className="font-normal text-stone-400 ml-1">（{d.purposeDetail}）</span>}
                      </p>
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={10} />
                        {new Date(d.donatedAt).toLocaleDateString("ja-JP")}
                        <span className="mx-1 text-stone-300">·</span>
                        {d.temple.name}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-stone-800 shrink-0 ml-3">¥{d.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
