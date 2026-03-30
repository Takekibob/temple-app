import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEventConfirmationEmail } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: eventId, pid } = await params;
    const { status } = await request.json();

    const VALID_STATUSES = ["APPLIED", "CONFIRMED", "WAITLISTED", "ATTENDED", "NO_SHOW", "CANCELLED"];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "不正なステータス値です" }, { status: 400 });
    }

    const event = await prisma.event.findFirst({ where: { id: eventId, templeId: authUser.templeId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const participation = await prisma.eventParticipation.findFirst({
      where: { id: pid, eventId },
    });
    if (!participation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.eventParticipation.update({
      where: { id: pid },
      data: { status },
    });

    // CONFIRMED になったときに確定メールを送信
    if (status === "CONFIRMED" && participation.status !== "CONFIRMED") {
      const full = await prisma.eventParticipation.findUnique({
        where: { id: pid },
        include: {
          member: { include: { user: { select: { email: true, name: true } } } },
          event: true,
        },
      });
      if (full?.member.user.email) {
        sendEventConfirmationEmail({
          to: full.member.user.email,
          memberName: full.member.user.name,
          eventTitle: full.event.title,
          eventDate: full.event.eventDate,
          startTime: full.event.startTime,
          location: full.event.location,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ participation: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
