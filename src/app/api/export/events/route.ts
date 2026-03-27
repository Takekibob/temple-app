import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ];
  return lines.join("\n");
}

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "申込", CONFIRMED: "確定", WAITLISTED: "キャンセル待ち",
  ATTENDED: "参加済", NO_SHOW: "不参加", CANCELLED: "キャンセル",
};
const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅", SHAKYO: "写経", YOGA: "ヨガ", MINDFULNESS: "マインドフルネス",
  LECTURE: "仏事講座", SEASONAL: "季節行事", OTHER: "その他",
};

// GET /api/export/events
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const participations = await prisma.eventParticipation.findMany({
      where: { event: { templeId: authUser.templeId } },
      include: {
        event: { select: { title: true, category: true, eventDate: true } },
        member: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: [{ event: { eventDate: "desc" } }, { createdAt: "asc" }],
    });

    const rows = participations.map((p) => ({
      イベントID: p.eventId,
      イベント名: p.event.title,
      カテゴリ: CATEGORY_LABELS[p.event.category] ?? p.event.category,
      開催日: p.event.eventDate.toISOString().slice(0, 10),
      参加者氏名: p.member.user.name,
      メールアドレス: p.member.user.email,
      会員種別: p.member.type === "DANKA" ? "檀家" : "ご縁さん",
      参加人数: p.numGuests,
      ステータス: STATUS_LABELS[p.status] ?? p.status,
      評価スコア: p.feedbackScore ?? "",
      感想: p.feedbackComment ?? "",
      申込日: p.createdAt.toISOString().slice(0, 10),
    }));

    const csv = "\uFEFF" + toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="event_participations_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
