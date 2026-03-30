import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/cron/inactive-check
// 毎日 03:00 JST: 90日以上未活動のご縁さん・見込みに管理者通知
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // 各寺院のADMINに通知（週1回・月曜のみ）
  const today = new Date();
  if (today.getDay() !== 1) {
    // 月曜以外はスキップ
    return NextResponse.json({ ok: true, skipped: true });
  }

  const temples = await prisma.temple.findMany({
    where: { isActive: true, planStatus: { not: "SUSPENDED" } },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: "ADMIN", isActive: true },
        select: { email: true, name: true },
        take: 1,
      },
    },
  });

  let notified = 0;

  for (const temple of temples) {
    const admin = temple.users[0];
    if (!admin?.email) continue;

    const inactiveCount = await prisma.member.count({
      where: {
        templeId: temple.id,
        stage: { in: ["GOEN", "PROSPECT"] },
        OR: [
          { lastActivityAt: { lt: ninetyDaysAgo } },
          { lastActivityAt: null },
        ],
      },
    });

    if (inactiveCount === 0) continue;

    const { getResend, FROM_EMAIL } = await import("@/lib/email");
    const resend = getResend();
    await resend.emails.send({
      from: `てらログ <${FROM_EMAIL}>`,
      to: admin.email,
      subject: `【${temple.name}】90日間未活動の会員が${inactiveCount}名います`,
      text: `
${admin.name ?? temple.name} ご担当者様

${temple.name}において、90日間以上活動のない会員が${inactiveCount}名いらっしゃいます。

フォローアップをご検討ください。

▼ 離脱リスク分析
${process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app"}/admin/analytics/retention

てらログ サポートチーム
      `.trim(),
    }).catch(() => {});

    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
