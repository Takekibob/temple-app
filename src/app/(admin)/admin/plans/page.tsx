import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_TEMPLATES } from "@/lib/planTemplates";
import PlanManageClient from "./PlanManageClient";

export default async function AdminPlansPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  // 各テンプレートキーに対応する既存プランを取得
  const existingPlans = await prisma.membershipPlan.findMany({
    where: {
      templeId: authUser.templeId,
      templateKey: { in: PLAN_TEMPLATES.map((t) => t.key) },
    },
    include: {
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
  });

  const planMap = Object.fromEntries(existingPlans.map((p) => [p.templateKey!, p]));

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">会員プラン管理</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          プランを有効にすると会員が加入できるようになります。金額はお寺ごとに設定できます。
        </p>
      </div>

      <PlanManageClient
        templates={PLAN_TEMPLATES.map((t) => ({
          ...t,
          benefits: [...t.benefits],
        }))}
        planMap={Object.fromEntries(
          Object.entries(planMap).map(([key, plan]) => [
            key,
            {
              id: plan.id,
              price: plan.price,
              isActive: plan.isActive,
              subscriberCount: plan._count.subscriptions,
            },
          ])
        )}
      />
    </div>
  );
}
