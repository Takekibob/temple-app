import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const ofuse = await prisma.ofuse.findUnique({ where: { id } });
    if (!ofuse || ofuse.templeId !== authUser.templeId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const { type, amount, paidAt, paymentMethod, receiptIssued, notes } = await request.json();

    const updated = await prisma.ofuse.update({
      where: { id },
      data: {
        ...(type ? { type } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(paidAt ? { paidAt: new Date(paidAt) } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(receiptIssued !== undefined ? { receiptIssued } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
    });

    return NextResponse.json({ ofuse: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const ofuse = await prisma.ofuse.findUnique({ where: { id } });
    if (!ofuse || ofuse.templeId !== authUser.templeId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.ofuse.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
