import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

// POST /api/members/[id]/promote — ご縁さんを檀家に昇格
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdmin();
    const { id } = await params;

    const member = await prisma.member.findFirst({
      where: { id, templeId: authUser.templeId },
    });

    if (!member) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (member.type === "DANKA") {
      return NextResponse.json({ error: "既に檀家です" }, { status: 400 });
    }

    const now = new Date();
    const [updated] = await prisma.$transaction([
      prisma.member.update({
        where: { id },
        data: {
          type: "DANKA",
          promotedAt: now,
          // Phase C: 昇格時にステージも同期
          stage: "DANKA",
          stageChangedAt: now,
          stageChangedBy: authUser.id,
        },
      }),
      prisma.stageTransition.create({
        data: {
          memberId: id,
          fromStage: member.stage,
          toStage: "DANKA",
          triggeredBy: authUser.id,
          reason: "ご縁さん→檀家 昇格",
        },
      }),
    ]);

    await logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "update",
      targetType: "member",
      targetId: id,
      targetName: member.familyName,
      detail: { promoted: true, stage: "DANKA" },
    });

    return NextResponse.json({ member: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
