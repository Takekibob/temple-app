import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_TEMPLATES } from "@/lib/planTemplates";
import Link from "next/link";
import CancelSubButton from "./CancelSubButton";
import { CreditCard, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE:   { label: "有効",       className: "bg-teal-100 text-teal-700" },
  PAST_DUE: { label: "支払い遅延", className: "bg-red-100 text-red-700" },
  CANCELED: { label: "解約済み",   className: "bg-stone-100 text-stone-500" },
  PAUSED:   { label: "一時停止",   className: "bg-amber-100 text-amber-700" },
};

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "月払い",
  YEARLY:  "年払い",
  ONE_TIME: "一回払い",
};

interface SearchParams { status?: string; planKey?: string }

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { status, planKey } = await searchParams;

  const templateKeys = PLAN_TEMPLATES.map((t) => t.key);
  const plans = await prisma.membershipPlan.findMany({
    where: { templeId: authUser.templeId, templateKey: { in: templateKeys } },
    include: {
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
  });

  const planStats = PLAN_TEMPLATES.map((t) => {
    const plan = plans.find((p) => p.templateKey === t.key);
    return {
      key: t.key,
      name: t.name,
      interval: t.interval,
      price: plan?.price ?? t.defaultPrice,
      isActive: plan?.isActive ?? false,
      activeCount: plan?._count.subscriptions ?? 0,
      planId: plan?.id ?? null,
    };
  });

  const where: Record<string, unknown> = { templeId: authUser.templeId };
  if (status) where.status = status;
  if (planKey) {
    const plan = plans.find((p) => p.templateKey === planKey);
    if (plan) where.planId = plan.id;
  }

  const subscriptions = await prisma.memberSubscription.findMany({
    where,
    include: {
      plan: true,
      member: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeStatus = status ?? "";
  const activePlanKey = planKey ?? "";

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <CreditCard size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">サブスク管理</h1>
        </div>
        <p className="text-sm text-stone-400">会員プランの加入状況</p>
      </div>

      {/* プラン別集計カード */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {planStats.map((s) => (
          <div key={s.key} className={`bg-white rounded-2xl border shadow-sm p-4 ${s.isActive ? "border-stone-100" : "border-stone-100 opacity-60"}`}>
            <p className="text-xs text-stone-400 mb-0.5">{INTERVAL_LABELS[s.interval]}</p>
            <p className="text-sm font-bold text-stone-800 leading-tight">{s.name}</p>
            <p className="text-xs text-stone-400 mt-0.5">¥{s.price.toLocaleString()} / {INTERVAL_LABELS[s.interval]}</p>
            <p className="text-2xl font-bold text-amber-700 mt-2">
              {s.activeCount}
              <span className="text-sm font-normal text-stone-500 ml-1">名加入中</span>
            </p>
            {!s.isActive && <p className="text-xs text-stone-400 mt-1">（未有効化）</p>}
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {[
            { value: "", label: "すべて" },
            { value: "ACTIVE", label: "有効" },
            { value: "PAST_DUE", label: "支払い遅延" },
            { value: "CANCELED", label: "解約済み" },
          ].map((f) => (
            <Link
              key={f.value}
              href={`/admin/revenue/subscriptions?status=${f.value}${activePlanKey ? `&planKey=${activePlanKey}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeStatus === f.value ? "bg-white text-amber-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {[
            { value: "", label: "全プラン" },
            ...PLAN_TEMPLATES.map((t) => ({ value: t.key, label: INTERVAL_LABELS[t.interval] })),
          ].map((f) => (
            <Link
              key={f.value}
              href={`/admin/revenue/subscriptions?${activeStatus ? `status=${activeStatus}&` : ""}planKey=${f.value}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePlanKey === f.value ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 一覧 */}
      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center text-stone-400 text-sm">
          該当するサブスクリプションがありません
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            {subscriptions.map((sub) => {
              const templateKey = sub.plan.templateKey;
              const template = PLAN_TEMPLATES.find((t) => t.key === templateKey);
              return (
                <div key={sub.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard size={14} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-stone-800">
                        {sub.member.user.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[sub.status]?.className ?? ""}`}>
                        {STATUS_LABELS[sub.status]?.label ?? sub.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <span>{template ? `${template.name}（${INTERVAL_LABELS[template.interval]}）` : sub.plan.name}</span>
                      <span>·</span>
                      <span>¥{sub.plan.price.toLocaleString()}</span>
                      {sub.currentPeriodEnd && (
                        <>
                          <span>·</span>
                          <span>次回: {new Date(sub.currentPeriodEnd).toLocaleDateString("ja-JP")}</span>
                        </>
                      )}
                      {sub.canceledAt && (
                        <>
                          <span>·</span>
                          <span>解約: {new Date(sub.canceledAt).toLocaleDateString("ja-JP")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sub.status === "ACTIVE" && <CancelSubButton subId={sub.id} />}
                    <Link href={`/admin/members/${sub.memberId}`}>
                      <ChevronRight size={14} className="text-stone-300" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
