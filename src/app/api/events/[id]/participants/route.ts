import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: eventId } = await params;

    const event = await prisma.event.findFirst({ where: { id: eventId, templeId: authUser.templeId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const participants = await prisma.eventParticipation.findMany({
      where: { eventId },
      include: {
        member: { include: { user: { select: { name: true, email: true, phone: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ participants });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
