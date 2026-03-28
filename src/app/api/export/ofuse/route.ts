import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
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

const OFUSE_TYPE_LABELS: Record<string, string> = {
  HOUYO: "法要", GOJIKAI: "護持会費", KIFU: "寄付", EVENT_FEE: "イベント参加費", OTHER: "その他",
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "現金", TRANSFER: "振込", ONLINE: "オンライン",
};

// GET /api/export/ofuse
export async function GET() {
  try {
    const authUser = await requireAdmin();

    const ofuse = await prisma.ofuse.findMany({
      where: { templeId: authUser.templeId },
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
      orderBy: { paidAt: "desc" },
    });

    const rows = ofuse.map((o) => ({
      ID: o.id,
      氏名: o.member.user.name,
      種別: OFUSE_TYPE_LABELS[o.type] ?? o.type,
      金額: o.amount,
      支払方法: PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod,
      支払日: o.paidAt.toISOString().slice(0, 10),
      領収書発行: o.receiptIssued ? "済" : "未",
      備考: o.notes ?? "",
      登録日: o.createdAt.toISOString().slice(0, 10),
    }));

    const csv = "\uFEFF" + toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ofuse_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
