import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-stone-800">寄付履歴</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          累計寄付額: ¥{total.toLocaleString()}
        </p>
      </div>

      {isAdminOrStaff ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-6 text-center">
          管理者・スタッフはこの機能を利用できません
        </div>
      ) : donationEnabled ? (
        <Link
          href="/app/donations/new"
          className="block w-full bg-amber-700 text-white text-center py-3 rounded-xl text-sm font-medium mb-6 hover:bg-amber-800"
        >
          オンラインで寄付する
        </Link>
      ) : (
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-500 mb-6 text-center">
          現在、オンライン寄付はご利用いただけません
        </div>
      )}

      {donations.length === 0 ? (
        <p className="text-center text-stone-400 py-12">寄付履歴がありません</p>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-800">¥{d.amount.toLocaleString()}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {PURPOSE_LABELS[d.purpose] ?? d.purpose}
                    {d.purposeDetail && ` (${d.purposeDetail})`}
                  </p>
                </div>
                <p className="text-xs text-stone-400">
                  {new Date(d.donatedAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
