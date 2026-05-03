import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/members/[id]/line-settings — LINE通知設定の更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.member) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;

    // 自分のメンバーIDのみ更新可
    if (authUser.member.id !== id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const {
      lineNotifyEnabled,
      notifyEvent,
      notifyAnnouncement,
    } = body;

    const data: Record<string, boolean> = {};
    if (typeof lineNotifyEnabled === "boolean") data.lineNotifyEnabled = lineNotifyEnabled;
    if (typeof notifyEvent === "boolean") data.notifyEvent = notifyEvent;
    if (typeof notifyAnnouncement === "boolean") data.notifyAnnouncement = notifyAnnouncement;

    const member = await prisma.member.update({
      where: { id },
      data,
      select: {
        lineNotifyEnabled: true,
        notifyEvent: true,
        notifyAnnouncement: true,
      },
    });

    return NextResponse.json({ member });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
