import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/journal/stats — 統計情報（連続日数・月別件数など）
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const journals = await prisma.journal.findMany({
    where: { userId: authUser.id },
    select: { entryDate: true, mood: true },
    orderBy: { entryDate: "desc" },
  });

  const total = journals.length;

  // 月別件数（直近12ヶ月）
  const now = new Date();
  const monthlyCounts: { year: number; month: number; count: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const count = journals.filter((j) => {
      const jd = new Date(j.entryDate);
      return jd.getFullYear() === y && jd.getMonth() + 1 === m;
    }).length;
    monthlyCounts.push({ year: y, month: m, count });
  }

  // 連続書き込み日数（entryDate の一意な日付で計算）
  const uniqueDates = Array.from(
    new Set(journals.map((j) => new Date(j.entryDate).toDateString()))
  ).map((d) => new Date(d)).sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (uniqueDates[i].toDateString() === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  // mood 分布
  const moodCounts: Record<string, number> = {};
  for (const j of journals) {
    if (j.mood) {
      moodCounts[j.mood] = (moodCounts[j.mood] ?? 0) + 1;
    }
  }

  return NextResponse.json({ total, streak, monthlyCounts, moodCounts });
}
