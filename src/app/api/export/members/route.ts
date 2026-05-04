import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

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

// GET /api/export/members
export async function GET() {
  try {
    const authUser = await requireAdmin();

    const members = await prisma.member.findMany({
      where: { templeId: authUser.templeId },
      include: { user: { select: { name: true, email: true, lastLoginAt: true } } },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    });

    const rows = members.map((m) => ({
      ID: m.id,
      氏名: m.user.name,
      メールアドレス: m.user.email,
      種別: "フォロワー",
      家族名: m.familyName,
      住所: m.address ?? "",
      郵便番号: m.postalCode ?? "",
      電話番号: m.phone ?? "",
      入会日: m.joinedDate.toISOString().slice(0, 10),
      最終ログイン: m.user.lastLoginAt?.toISOString().slice(0, 16) ?? "",
      登録日: m.createdAt.toISOString().slice(0, 10),
    }));

    await logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "export",
      targetType: "member",
      detail: { count: members.length },
    });

    const csv = "\uFEFF" + toCsv(rows); // BOM for Excel
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="members_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
