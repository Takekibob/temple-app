import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 });
const prisma = new PrismaClient({ adapter });

async function main() {
  // テンプレート以外のプランを検索
  const nonTemplatePlans = await prisma.membershipPlan.findMany({
    where: {
      OR: [
        { templateKey: null },
        { templateKey: { notIn: ["MONTHLY", "ANNUAL"] } },
      ],
    },
    include: { _count: { select: { subscriptions: true } } },
  });

  console.log("削除対象プラン:", nonTemplatePlans.map((p) => ({
    id: p.id, name: p.name, subscriptions: p._count.subscriptions,
  })));

  if (nonTemplatePlans.length === 0) {
    console.log("削除対象なし");
    return;
  }

  const planIds = nonTemplatePlans.map((p) => p.id);

  // 関連サブスクリプションを削除
  const deletedSubs = await prisma.memberSubscription.deleteMany({
    where: { planId: { in: planIds } },
  });
  console.log(`サブスクリプション削除: ${deletedSubs.count}件`);

  // プランを削除
  const deletedPlans = await prisma.membershipPlan.deleteMany({
    where: { id: { in: planIds } },
  });
  console.log(`プラン削除: ${deletedPlans.count}件`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
