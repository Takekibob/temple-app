import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_TEMPLATES } from "@/lib/planTemplates";
import SubscribeButton from "./SubscribeButton";
import { Check, Minus, Ticket } from "lucide-react";

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
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">会員プラン</h1>
        <p className="text-xs text-stone-400 mt-0.5">サブスクリプションプランの確認・加入</p>
      </div>

      <div className="px-4 space-y-5">
        {isAdminOrStaff && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 text-center">
            管理者・スタッフはこの機能を利用できません
          </div>
        )}

        {/* プラン比較表 */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 text-center border-b border-stone-100">
            <div className="py-3 text-xs font-bold text-stone-400 px-2">機能</div>
            <div className="py-3 text-xs font-bold text-stone-500 bg-stone-50 border-x border-stone-100">無料会員</div>
            <div className="py-3 text-xs font-bold text-amber-800 bg-amber-50">会員プラン</div>
          </div>
          {COMPARISON_ROWS.map((row, i) => (
            <div key={i} className="grid grid-cols-3 border-b border-stone-50 last:border-0">
              <div className="py-3.5 px-3 text-xs text-stone-600 flex items-center">{row.label}</div>
              <div className="py-3.5 bg-stone-50 border-x border-stone-100 flex items-center justify-center">
                {row.free
                  ? <Check size={14} className="text-teal-600 stroke-2" />
                  : <Minus size={14} className="text-stone-300" />}
              </div>
              <div className="py-3.5 bg-amber-50 flex items-center justify-center">
                {row.paid
                  ? <Check size={14} className="text-teal-600 stroke-2" />
                  : <Minus size={14} className="text-stone-300" />}
              </div>
            </div>
          ))}
        </div>

        {/* プランカード */}
        {templatePlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Ticket size={22} className="text-stone-400" />
            </div>
            <p className="text-stone-400 text-sm">現在ご利用いただけるプランがありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {PLAN_TEMPLATES.map((template) => {
              const plan = planByKey[template.key];
              if (!plan) return null;
              const isSubscribed = activePlanIds.has(plan.id);

              return (
                <div
                  key={template.key}
                  className={`bg-white rounded-2xl border shadow-sm p-5 ${
                    isSubscribed ? "border-amber-300" : "border-stone-100"
                  }`}
                >
                  {isSubscribed && (
                    <div className="flex items-center justify-end mb-2">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} strokeWidth={3} />
                        加入中
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <Ticket size={15} className="text-emerald-600" />
                    <h3 className="font-bold text-stone-800">{plan.name}</h3>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-stone-500 mb-4 ml-5">{plan.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-2xl font-bold text-stone-800">
                      ¥{plan.price.toLocaleString()}
                      <span className="text-xs font-normal text-stone-400 ml-1">
                        / {INTERVAL_LABELS[plan.interval] ?? plan.interval}
                      </span>
                    </p>
                    {!isSubscribed && <SubscribeButton planId={plan.id} isAdmin={isAdminOrStaff} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
