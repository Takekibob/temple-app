import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ participation: updated });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
