import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

// POST /api/export/all — 全データバックアップエクスポート（ADMIN限定）
export async function POST() {
  try {
    const authUser = await requireAdmin();
    const templeId = authUser.templeId;

    const [
      members,
      events,
      announcements,
      activityLogs,
    ] = await Promise.all([
      prisma.member.findMany({
        where: { templeId },
        include: { user: { select: { name: true, email: true, phone: true } } },
      }),
      prisma.event.findMany({
        where: { templeId },
        include: { participations: true },
      }),
      prisma.announcement.findMany({ where: { templeId } }),
      prisma.activityLog.findMany({
        where: { templeId },
        orderBy: { createdAt: "desc" },
        take: 10000,
      }),
    ]);

    await logActivity({
      templeId,
      userId: authUser.id,
      action: "export",
      targetType: "settings",
      detail: {
        type: "full_backup",
        counts: {
          members: members.length,
          events: events.length,
          announcements: announcements.length,
          activityLogs: activityLogs.length,
        },
      },
    });

    const exportedAt = new Date().toISOString();
    return NextResponse.json({
      exportedAt,
      templeId,
      data: {
        members,
        events,
        announcements,
        activityLogs,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
