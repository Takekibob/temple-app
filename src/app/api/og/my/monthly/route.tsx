import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/og/my/monthly?year=2026&month=5 — 1080×1080 月次振り返り画像
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const memberId = authUser.member?.id;

  const fontData = readFileSync(join(process.cwd(), "public/fonts/NotoSansJP-Regular.ttf"));

  const [journalCount, eventCount, journalTags] = await Promise.all([
    prisma.journal.count({
      where: { userId: authUser.id, entryDate: { gte: monthStart, lte: monthEnd } },
    }),
    memberId
      ? prisma.eventParticipation.count({
          where: {
            memberId,
            status: { in: ["APPLIED", "CONFIRMED"] },
            event: { eventDate: { gte: monthStart, lte: monthEnd } },
          },
        })
      : Promise.resolve(0),
    prisma.journal.findMany({
      where: { userId: authUser.id, entryDate: { gte: monthStart, lte: monthEnd } },
      select: { tags: true },
    }),
  ]);

  // タグ集計
  const tagCounts = new Map<string, number>();
  for (const j of journalTags) {
    for (const tag of j.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const monthLabel = `${year}年${month}月`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1A1A1A",
          padding: "80px",
          fontFamily: "NotoJP",
          color: "#F8F5EF",
        }}
      >
        {/* ロゴ + 月 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "72px" }}>
          <span style={{ fontSize: 22, color: "#8C8070", letterSpacing: "0.32em" }}>て ら ロ グ</span>
          <span style={{ fontSize: 22, color: "#8C8070" }}>{monthLabel}</span>
        </div>

        {/* メインタイトル */}
        <div style={{ display: "flex", marginBottom: "16px" }}>
          <span style={{ fontSize: 20, color: "#8C8070", letterSpacing: "0.3em" }}>今 月 の ま と め</span>
        </div>
        <div style={{ display: "flex", width: "48px", height: "1px", backgroundColor: "#8C8070", marginBottom: "64px" }} />

        {/* 統計 */}
        <div style={{ display: "flex", gap: "48px", marginBottom: "64px" }}>
          {/* 日記 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: 20, color: "#8C8070" }}>📿</span>
            <span style={{ fontSize: 80, color: "#F8F5EF", lineHeight: 1, fontWeight: 300 }}>
              {journalCount}
            </span>
            <span style={{ fontSize: 20, color: "#8C8070", letterSpacing: "0.1em" }}>学びの日記</span>
          </div>
          {/* 区切り */}
          <div style={{ display: "flex", width: "0.5px", backgroundColor: "#3A3A3A" }} />
          {/* 集い */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: 20, color: "#8C8070" }}>🏯</span>
            <span style={{ fontSize: 80, color: "#F8F5EF", lineHeight: 1, fontWeight: 300 }}>
              {eventCount}
            </span>
            <span style={{ fontSize: 20, color: "#8C8070", letterSpacing: "0.1em" }}>参加した集い</span>
          </div>
        </div>

        {/* タグ */}
        {topTags.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
            <span style={{ fontSize: 18, color: "#5A5A5A", letterSpacing: "0.2em" }}>印 象 的 だ っ た こ と</span>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {topTags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: "#C8BEAE",
                    border: "0.5px solid #3A3A3A",
                    padding: "8px 20px",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* フッター */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "auto" }}>
          <span style={{ fontSize: 18, color: "#5A5A5A", letterSpacing: "0.05em" }}>teralog.app</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: "NotoJP", data: fontData, weight: 400, style: "normal" }],
    }
  );
}
