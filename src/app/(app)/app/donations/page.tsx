import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Gift, Heart, Calendar } from "lucide-react";

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

  const [donations, temple] = await Promise.all([
    prisma.donation.findMany({
      where: { memberId: authUser.member.id },
      orderBy: { donatedAt: "desc" },
    }),
    prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: { stripeConnectOnboarded: true },
    }),
  ]);

  const isAdminOrStaff = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  const donationEnabled = temple?.stripeConnectOnboarded ?? false;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">寄付履歴</h1>
      </div>

      <div className="px-4 space-y-4">
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

        {/* CTA */}
        {isAdminOrStaff ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 text-center">
            管理者・スタッフはこの機能を利用できません
          </div>
        ) : donationEnabled ? (
          <Link
            href="/app/donations/new"
            className="flex items-center justify-center gap-2 w-full bg-amber-700 text-white text-sm font-semibold py-3.5 rounded-2xl shadow-sm hover:bg-amber-800 transition-colors"
          >
            <Gift size={16} />
            オンラインで寄付する
          </Link>
        ) : (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-500 text-center">
            現在、オンライン寄付はご利用いただけません
          </div>
        )}

        {/* 履歴リスト */}
        {donations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
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
                    </p>
                  </div>
                </div>
                <p className="font-bold text-stone-800 shrink-0 ml-3">¥{d.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
