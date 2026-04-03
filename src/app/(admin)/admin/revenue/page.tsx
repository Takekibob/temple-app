import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BadgeJapaneseYen, Heart, Ticket, CreditCard, TrendingUp, ChevronRight } from "lucide-react";

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

  const totalMonthly =
    (donationMonthly._sum.amount ?? 0) +
    subMonthlyRevenue +
    (eventRevenue._sum.paymentAmount ?? 0);

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <BadgeJapaneseYen size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">収益管理</h1>
        </div>
        <p className="text-sm text-stone-400">寄付・サブスク・イベント収益の統合管理</p>
      </div>

      {/* 今月合計ハイライト */}
      <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl p-5 mb-5 shadow-md">
        <p className="text-xs font-semibold text-amber-200 uppercase tracking-widest mb-1">今月の合計収益</p>
        <p className="text-4xl font-bold text-white">¥{totalMonthly.toLocaleString()}</p>
        <p className="text-xs text-amber-200 mt-1">{now.getFullYear()}年{now.getMonth() + 1}月</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart size={12} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">今月の寄付</p>
          </div>
          <p className="text-2xl font-bold text-stone-800">
            ¥{(donationMonthly._sum.amount ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{donationMonthly._count}件</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">年間寄付累計</p>
          </div>
          <p className="text-2xl font-bold text-stone-800">
            ¥{(donationYearly._sum.amount ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{now.getFullYear()}年</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <CreditCard size={12} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">サブスク月次</p>
          </div>
          <p className="text-2xl font-bold text-stone-800">
            ¥{subMonthlyRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">{activeSubs.length}名加入中</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Ticket size={12} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">今月イベント</p>
          </div>
          <p className="text-2xl font-bold text-stone-800">
            ¥{(eventRevenue._sum.paymentAmount ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">参加費</p>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Link href="/admin/revenue/donations"
          className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 hover:border-amber-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Heart size={18} className="text-amber-700" />
              </div>
              <div>
                <h2 className="font-bold text-stone-800">寄付管理</h2>
                <p className="text-xs text-stone-400 mt-0.5">記録・お礼メール送信</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-stone-300" />
          </div>
        </Link>
        <Link href="/admin/plans"
          className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 hover:border-amber-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Ticket size={18} className="text-amber-700" />
              </div>
              <div>
                <h2 className="font-bold text-stone-800">会員プラン</h2>
                <p className="text-xs text-stone-400 mt-0.5">プラン有効化・金額設定</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-stone-300" />
          </div>
        </Link>
        <Link href="/admin/revenue/subscriptions"
          className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 hover:border-amber-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <CreditCard size={18} className="text-amber-700" />
              </div>
              <div>
                <h2 className="font-bold text-stone-800">サブスク管理</h2>
                <p className="text-xs text-stone-400 mt-0.5">加入状況の確認</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-stone-300" />
          </div>
        </Link>
      </div>
    </div>
  );
}
