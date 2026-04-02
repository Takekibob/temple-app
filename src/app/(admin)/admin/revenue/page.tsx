import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RevenuePage() {
  const authUser = await requireAdminOrStaff();
  const templeId = authUser.templeId;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    donationMonthly,
    donationYearly,
    activeSubs,
    eventRevenue,
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: { templeId, donatedAt: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.aggregate({
      where: { templeId, donatedAt: { gte: startOfYear } },
      _sum: { amount: true },
    }),
    prisma.memberSubscription.findMany({
      where: { templeId, status: "ACTIVE" },
      include: { plan: { select: { price: true, name: true } } },
    }),
    prisma.eventParticipation.aggregate({
      where: {
        event: { templeId },
        paymentStatus: "PAID",
        createdAt: { gte: startOfMonth },
      },
      _sum: { paymentAmount: true },
    }),
  ]);

  const subMonthlyRevenue = activeSubs
    .filter((s) => s.plan)
    .reduce((sum, s) => sum + s.plan.price, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">収益管理</h1>
        <p className="text-sm text-stone-500 mt-0.5">寄付・サブスク・イベント収益の統合管理</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">今月の寄付</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">
            ¥{(donationMonthly._sum.amount ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-1">{donationMonthly._count}件</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">年間寄付累計</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">
            ¥{(donationYearly._sum.amount ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">サブスク月次収益</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">
            ¥{subMonthlyRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-1">{activeSubs.length}名加入中</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">今月のイベント収益</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">
            ¥{(eventRevenue._sum.paymentAmount ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link href="/admin/revenue/donations" className="bg-white rounded-xl border border-stone-200 p-5 hover:border-amber-400 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🙏</span>
            <h2 className="font-semibold text-stone-800">寄付管理</h2>
          </div>
          <p className="text-sm text-stone-500">寄付記録の一覧・追加・お礼メール送信</p>
        </Link>
        <Link href="/admin/plans" className="bg-white rounded-xl border border-stone-200 p-5 hover:border-amber-400 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎫</span>
            <h2 className="font-semibold text-stone-800">会員プラン</h2>
          </div>
          <p className="text-sm text-stone-500">月払い・年払いプランの有効化と金額設定</p>
        </Link>
        <Link href="/admin/revenue/subscriptions" className="bg-white rounded-xl border border-stone-200 p-5 hover:border-amber-400 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💳</span>
            <h2 className="font-semibold text-stone-800">サブスク管理</h2>
          </div>
          <p className="text-sm text-stone-500">会員のサブスクリプション加入状況</p>
        </Link>
      </div>
    </div>
  );
}
