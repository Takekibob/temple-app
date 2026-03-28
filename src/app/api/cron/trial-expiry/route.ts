import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTrialExpiryEmail } from "@/lib/email";

// GET /api/cron/trial-expiry — トライアル終了通知（Vercel Cron で毎日 09:00 JST に実行）
export async function GET(request: NextRequest) {
  // Vercel Cron の認証チェック
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // TRIAL 状態の寺院を取得（trialEndsAt が設定済みのもの）
  const trials = await prisma.temple.findMany({
    where: {
      planStatus: "TRIAL",
      trialEndsAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      trialEndsAt: true,
      users: {
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
        select: { email: true },
        take: 1,
      },
    },
  });

  const results: { templeId: string; sent: boolean; reason?: string }[] = [];

  for (const temple of trials) {
    if (!temple.trialEndsAt) continue;

    const adminEmail = temple.users[0]?.email;
    if (!adminEmail) {
      results.push({ templeId: temple.id, sent: false, reason: "no admin email" });
      continue;
    }

    const msLeft = temple.trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    // 残り7日 または 当日（0日）のみ送信
    if (daysLeft !== 7 && daysLeft !== 0) {
      results.push({ templeId: temple.id, sent: false, reason: `daysLeft=${daysLeft}` });
      continue;
    }

    try {
      await sendTrialExpiryEmail({
        to: adminEmail,
        templeName: temple.name,
        daysRemaining: daysLeft,
        trialEndsAt: temple.trialEndsAt,
      });
      results.push({ templeId: temple.id, sent: true });
    } catch (err) {
      console.error(`[trial-expiry] Failed to send email to ${adminEmail}:`, err);
      results.push({ templeId: temple.id, sent: false, reason: "email error" });
    }
  }

  console.log("[/api/cron/trial-expiry]", results);
  return NextResponse.json({ ok: true, processed: results.length, results });
}
