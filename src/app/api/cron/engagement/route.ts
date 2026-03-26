import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/cron/engagement
// エンゲージメントスコアを再計算 (UTC 17:00 = JST 02:00)
// score = Σ(points × e^(-0.05 × days_ago)), clamped 0–100
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const DECAY_RATE = 0.05;

  // 90日以内のアクティビティを全員分取得
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const activities = await prisma.memberActivity.findMany({
    where: { createdAt: { gte: since } },
    select: { memberId: true, score: true, createdAt: true },
  });

  // memberId ごとに加算
  const scoreMap = new Map<string, number>();
  for (const a of activities) {
    const daysAgo = (now.getTime() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const decayed = a.score * Math.exp(-DECAY_RATE * daysAgo);
    scoreMap.set(a.memberId, (scoreMap.get(a.memberId) ?? 0) + decayed);
  }

  // 全 Member の id を取得（スコアが変わったものだけ更新）
  const allMembers = await prisma.member.findMany({
    select: { id: true, engagementScore: true },
  });

  let updated = 0;
  await Promise.all(
    allMembers.map(async (m) => {
      const raw = scoreMap.get(m.id) ?? 0;
      const newScore = Math.round(Math.min(100, Math.max(0, raw)));
      if (newScore !== m.engagementScore) {
        await prisma.member.update({
          where: { id: m.id },
          data: { engagementScore: newScore },
        });
        updated++;
      }
    })
  );

  return NextResponse.json({ ok: true, updated });
}
