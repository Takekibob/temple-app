import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_TEMPLATES } from "@/lib/planTemplates";
import SubscribeButton from "./SubscribeButton";

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "月額",
  YEARLY: "年額",
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

  // テンプレートキーに対応するプランのみ取得
  const [templatePlans, mySubscriptions] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: {
        templeId: authUser.templeId,
        templateKey: { in: PLAN_TEMPLATES.map((t) => t.key) },
        isActive: true,
      },
    }),
    prisma.memberSubscription.findMany({
      where: { memberId: authUser.member.id, status: "ACTIVE" },
      select: { planId: true },
    }),
  ]);

  const activePlanIds = new Set(mySubscriptions.map((s) => s.planId));
  const planByKey = Object.fromEntries(templatePlans.map((p) => [p.templateKey!, p]));

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
          <div className="py-3 text-stone-600 bg-stone-50 border-x border-stone-100">無料会員</div>
          <div className="py-3 text-amber-800 bg-amber-50">会員プラン</div>
        </div>
        {COMPARISON_ROWS.map((row, i) => (
          <div key={i} className="grid grid-cols-3 text-center border-b border-stone-50 last:border-0">
            <div className="py-3 px-2 text-xs text-stone-600 text-left">{row.label}</div>
            <div className="py-3 bg-stone-50 border-x border-stone-100 flex items-center justify-center">
              {row.free ? <span className="text-teal-600 text-sm font-bold">✓</span> : <span className="text-stone-300 text-sm">—</span>}
            </div>
            <div className="py-3 bg-amber-50 flex items-center justify-center">
              {row.paid ? <span className="text-teal-600 text-sm font-bold">✓</span> : <span className="text-stone-300 text-sm">—</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 固定2プランのみ表示 */}
      <div className="space-y-3">
        {PLAN_TEMPLATES.map((template) => {
          const plan = planByKey[template.key];
          if (!plan) return null;

          const isSubscribed = activePlanIds.has(plan.id);

          return (
            <div
              key={template.key}
              className={`bg-white rounded-xl border p-4 ${isSubscribed ? "border-amber-400" : "border-stone-200"}`}
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-stone-800">{plan.name}</h3>
                {isSubscribed && (
                  <span className="text-xs text-amber-700 font-medium">加入中</span>
                )}
              </div>
              {plan.description && (
                <p className="text-xs text-stone-500 mb-3">{plan.description}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="font-bold text-stone-800">
                  ¥{plan.price.toLocaleString()}
                  <span className="text-xs font-normal text-stone-500 ml-1">
                    / {INTERVAL_LABELS[plan.interval] ?? plan.interval}
                  </span>
                </p>
                {!isSubscribed && <SubscribeButton planId={plan.id} isAdmin={isAdminOrStaff} />}
              </div>
            </div>
          );
        })}
      </div>

      {templatePlans.length === 0 && (
        <p className="text-center text-stone-400 py-12">現在ご利用いただけるプランがありません</p>
      )}
    </div>
  );
}
