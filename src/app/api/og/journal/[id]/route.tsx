import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { buildExcerpt } from "@/lib/journal/excerpt";

const MOOD_ICONS: Record<string, string> = {
  PEACEFUL: "🌿",
  GRATEFUL: "🙏",
  STRUGGLING: "🌊",
  REFLECTIVE: "🪞",
  JOYFUL: "☀️",
};

const JP_DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// GET /api/og/journal/[id] — 1080×1350 Journal シェア画像
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;

  const journal = await prisma.journal.findFirst({
    where: { id, userId: authUser.id }, // 必ず自分のもののみ
  });
  if (!journal) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // フォント読み込み（NotoSansJP — ローカルファイルで確実に埋め込み）
  const fontData = readFileSync(join(process.cwd(), "public/fonts/NotoSansJP-Regular.ttf"));

  const d = new Date(journal.entryDate);
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${JP_DAYS[d.getDay()]}）`;
  const excerpt = buildExcerpt(journal.content, 120);
  const title = journal.title ? journal.title.slice(0, 28) + (journal.title.length > 28 ? "…" : "") : null;
  const moodIcon = journal.mood ? (MOOD_ICONS[journal.mood] ?? "") : "";
  const displayTags = journal.tags.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F8F5EF",
          backgroundImage:
            "radial-gradient(ellipse at 0% 0%, #EDE8DE 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, #E8E2D4 0%, transparent 55%)",
          padding: "80px",
          fontFamily: "NotoJP",
        }}
      >
        {/* ロゴ + mood */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "64px" }}>
          <span style={{ fontSize: 22, color: "#9C8B77", letterSpacing: "0.32em" }}>て ら ロ グ</span>
          {moodIcon && <span style={{ fontSize: 44 }}>{moodIcon}</span>}
        </div>

        {/* 日付 */}
        <div style={{ display: "flex", marginBottom: "24px" }}>
          <span style={{ fontSize: 22, color: "#9C8B77", letterSpacing: "0.05em" }}>{dateStr}</span>
        </div>

        {/* 区切り線 */}
        <div style={{ display: "flex", width: "48px", height: "1px", backgroundColor: "#1A1A1A", marginBottom: "52px" }} />

        {/* タイトル */}
        {title && (
          <div style={{ display: "flex", marginBottom: "28px" }}>
            <span style={{ fontSize: 50, color: "#1A1A1A", lineHeight: 1.5, fontWeight: 500 }}>
              {title}
            </span>
          </div>
        )}

        {/* 本文抜粋 */}
        <div style={{ display: "flex", flex: 1 }}>
          <span style={{ fontSize: 28, color: "#4A4640", lineHeight: 2.1 }}>
            {excerpt}
          </span>
        </div>

        {/* タグ */}
        {displayTags.length > 0 && (
          <div style={{ display: "flex", gap: "10px", marginBottom: "40px", flexWrap: "wrap" }}>
            {displayTags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  fontSize: 18,
                  color: "#9C8B77",
                  border: "0.5px solid #C8BEAE",
                  padding: "6px 14px",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        )}

        {/* フッター */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", width: "100%", height: "0.5px", backgroundColor: "#D5CCB8", position: "absolute" }} />
          <span style={{ fontSize: 18, color: "#B8AE9C", letterSpacing: "0.05em" }}>teralog.app</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [{ name: "NotoJP", data: fontData, weight: 400, style: "normal" }],
    }
  );
}
