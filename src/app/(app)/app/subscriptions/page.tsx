import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SubscribeButton from "./SubscribeButton";

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "月額",
  YEARLY: "年額",
  ONE_TIME: "一回払い",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "有効", className: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "支払い遅延", className: "bg-red-100 text-red-700" },
  CANCELED: { label: "解約済み", className: "bg-stone-100 text-stone-500" },
  PAUSED: { label: "一時停止", className: "bg-yellow-100 text-yellow-700" },
};

const COMPARISON_ROWS = [
  { label: "お知らせ・年間行事案内", free: true, paid: true },
  { label: "法要予約", free: true, paid: true },
  { label: "一般イベントへの参加", free: true, paid: true },
  { label: "会員限定イベントへの参加", free: false, paid: true },
  { label: "会員限定ブログ・コンテンツの閲覧", free: false, paid: true },
];

export default async function SubscriptionsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const isAdminOrStaff = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

  const [mySubscriptions, availablePlans] = await Promise.all([
    prisma.memberSubscription.findMany({
      where: { memberId: authUser.member.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membershipPlan.findMany({
      where: { templeId: authUser.templeId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const activeSubPlanIds = mySubscriptions
    .filter((s) => s.status === "ACTIVE")
    .map((s) => s.planId);

  const isSubscribed = activeSubPlanIds.length > 0;

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-800">会員プラン</h1>
        <p className="text-sm text-stone-500 mt-0.5">サブスクリプションプランの確認・加入</p>
      </div>

      {isAdminOrStaff && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-6 text-center">
          管理者・スタッフはこの機能を利用できません
        </div>
      )}

      {/* プラン比較表 */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
        <div className="grid grid-cols-3 text-center text-xs font-semibold border-b border-stone-100">
          <div className="py-3 text-stone-500">機能</div>
          <div className="py-3 text-stone-600 bg-stone-50 border-x border-stone-100">
            無料会員
          </div>
          <div className="py-3 text-amber-800 bg-amber-50">
            会員プラン
          </div>
        </div>
        {COMPARISON_ROWS.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-3 text-center border-b border-stone-50 last:border-0"
          >
            <div className="py-3 px-2 text-xs text-stone-600 text-left">{row.label}</div>
            <div className="py-3 bg-stone-50 border-x border-stone-100 flex items-center justify-center">
              {row.free ? (
                <span className="text-teal-600 text-sm font-bold">✓</span>
              ) : (
                <span className="text-stone-300 text-sm">—</span>
              )}
            </div>
            <div className="py-3 bg-amber-50 flex items-center justify-center">
              {row.paid ? (
                <span className="text-teal-600 text-sm font-bold">✓</span>
              ) : (
                <span className="text-stone-300 text-sm">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 加入中プラン */}
      {mySubscriptions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-2">加入中のプラン</h2>
          <div className="space-y-3">
            {mySubscriptions.map((sub) => (
              <div key={sub.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-stone-800">{sub.plan.name}</p>
                    <p className="text-sm text-stone-600 mt-0.5">
                      ¥{sub.plan.price.toLocaleString()} / {INTERVAL_LABELS[sub.plan.interval]}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[sub.status]?.className ?? ""}`}>
                    {STATUS_LABELS[sub.status]?.label ?? sub.status}
                  </span>
                </div>
                {sub.currentPeriodEnd && (
                  <p className="text-xs text-stone-400 mt-2">
                    次回更新: {new Date(sub.currentPeriodEnd).toLocaleDateString("ja-JP")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 利用可能なプラン */}
      {!isSubscribed && availablePlans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-600 mb-2">プランを選ぶ</h2>
          <div className="space-y-3">
            {availablePlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-stone-800">{plan.name}</h3>
                </div>
                {plan.description && (
                  <p className="text-xs text-stone-500 mb-3">{plan.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="font-bold text-stone-800">
                    ¥{plan.price.toLocaleString()}
                    <span className="text-xs font-normal text-stone-500 ml-1">/ {INTERVAL_LABELS[plan.interval]}</span>
                  </p>
                  <SubscribeButton planId={plan.id} isAdmin={isAdminOrStaff} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {availablePlans.length === 0 && mySubscriptions.length === 0 && (
        <p className="text-center text-stone-400 py-12">現在ご利用いただけるプランがありません</p>
      )}
    </div>
  );
}
