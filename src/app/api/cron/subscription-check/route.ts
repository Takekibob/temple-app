import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/cron/subscription-check
// 毎日09:00 JST: Stripeサブスク状態とDBを同期
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const activeSubscriptions = await prisma.memberSubscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PAST_DUE"] },
      stripeSubscriptionId: { not: null },
    },
    select: { id: true, stripeSubscriptionId: true },
  });

  let updated = 0;

  for (const sub of activeSubscriptions) {
    if (!sub.stripeSubscriptionId) continue;

    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      const rawSub = stripeSub as unknown as Record<string, unknown>;

      const statusMap: Record<string, string> = {
        active: "ACTIVE",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        paused: "PAUSED",
        unpaid: "PAST_DUE",
        incomplete: "PAST_DUE",
        incomplete_expired: "CANCELED",
        trialing: "ACTIVE",
      };

      const newStatus = statusMap[stripeSub.status] ?? "PAST_DUE";

      await prisma.memberSubscription.update({
        where: { id: sub.id },
        data: {
          status: newStatus as never,
          currentPeriodStart: rawSub.current_period_start
            ? new Date(Number(rawSub.current_period_start) * 1000)
            : undefined,
          currentPeriodEnd: rawSub.current_period_end
            ? new Date(Number(rawSub.current_period_end) * 1000)
            : undefined,
        },
      });

      updated++;
    } catch {
      // Stripe APIエラーはスキップ（次回再試行）
    }
  }

  return NextResponse.json({ ok: true, checked: activeSubscriptions.length, updated });
}
