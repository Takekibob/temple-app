import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/membership-types/[id] — 更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;
    const body = await request.json();
    const { name, description, pricingModel, priceJpy, billingCycle, isPublic, sortOrder } = body;

    const existing = await prisma.membershipType.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.membershipType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(pricingModel !== undefined && { pricingModel }),
        ...(priceJpy !== undefined && { priceJpy }),
        ...(billingCycle !== undefined && { billingCycle }),
        ...(isPublic !== undefined && { isPublic }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ membershipType: updated });
  } catch (err) {
    console.error("[PATCH /api/membership-types/[id]]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/membership-types/[id] — 削除
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const existing = await prisma.membershipType.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const activeCount = await prisma.membership.count({
      where: { membershipTypeId: id, status: "ACTIVE" },
    });
    if (activeCount > 0) {
      return NextResponse.json(
        { error: `有効な加入者が ${activeCount} 名います。先に全員を解除してください。` },
        { status: 409 }
      );
    }

    await prisma.membershipType.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/membership-types/[id]]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
