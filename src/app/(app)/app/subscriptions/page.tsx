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

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-800">会員プラン</h1>
        <p className="text-sm text-stone-500 mt-0.5">サブスクリプションプランの確認・加入</p>
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
      {availablePlans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-600 mb-2">利用可能なプラン</h2>
          <div className="space-y-3">
            {availablePlans.map((plan) => {
              const isSubscribed = activeSubPlanIds.includes(plan.id);
              const benefits = Array.isArray(plan.benefits) ? plan.benefits as string[] : [];
              return (
                <div key={plan.id} className={`bg-white rounded-xl border p-4 ${isSubscribed ? "border-amber-300" : "border-stone-200"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-stone-800">{plan.name}</h3>
                    {isSubscribed && (
                      <span className="text-xs text-amber-700 font-medium">加入中</span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-stone-500 mb-2">{plan.description}</p>
                  )}
                  {benefits.length > 0 && (
                    <ul className="text-xs text-stone-600 space-y-0.5 mb-3">
                      {benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <span className="text-amber-600">・</span>{b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-stone-800">
                      ¥{plan.price.toLocaleString()}
                      <span className="text-xs font-normal text-stone-500 ml-1">/ {INTERVAL_LABELS[plan.interval]}</span>
                    </p>
                    {!isSubscribed && <SubscribeButton planId={plan.id} isAdmin={isAdminOrStaff} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {availablePlans.length === 0 && mySubscriptions.length === 0 && (
        <p className="text-center text-stone-400 py-12">現在ご利用いただけるプランがありません</p>
      )}
    </div>
  );
}
