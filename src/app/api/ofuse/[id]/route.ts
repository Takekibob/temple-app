import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

    const ofuse = await prisma.ofuse.findUnique({
      where: { id },
      include: {
        member: { include: { user: { select: { name: true } } } },
        reservation: true,
      },
    });

    if (!ofuse || ofuse.templeId !== authUser.templeId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (!isAdmin && ofuse.memberId !== authUser.member?.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ ofuse });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
