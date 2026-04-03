import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { validatePhone, validatePostalCode, normalizePostalCode } from "@/lib/memberValidation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const member = await prisma.member.findFirst({
      where: { id, templeId: authUser.templeId },
      include: {
        user: { select: { name: true, email: true, phone: true, createdAt: true } },
        deceasedPersons: { orderBy: { deathDate: "desc" } },
        eventParticipations: {
          include: { event: { select: { title: true, eventDate: true, category: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        gojikaiPayments: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ member });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.member.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { name, phone, type, familyName, address, postalCode, notes } = body;

    // バリデーション
    const phoneErr = phone !== undefined ? validatePhone(phone) : null;
    if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });

    const postalErr = postalCode !== undefined ? validatePostalCode(postalCode) : null;
    if (postalErr) return NextResponse.json({ error: postalErr }, { status: 400 });

    const [member] = await Promise.all([
      prisma.member.update({
        where: { id },
        data: {
          ...(type !== undefined && { type }),
          ...(familyName !== undefined && { familyName }),
          ...(address !== undefined && { address }),
          ...(postalCode !== undefined && { postalCode: postalCode ? normalizePostalCode(postalCode) : null }),
          ...(notes !== undefined && { notes }),
        },
      }),
      name !== undefined || phone !== undefined
        ? prisma.user.update({
            where: { id: existing.userId },
            data: {
              ...(name !== undefined && { name }),
              ...(phone !== undefined && { phone }),
            },
          })
        : Promise.resolve(),
    ]);

    await logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "update",
      targetType: "member",
      targetId: id,
      targetName: existing.familyName ?? undefined,
      detail: { updated: Object.keys(body) },
    });

    return NextResponse.json({ member });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
