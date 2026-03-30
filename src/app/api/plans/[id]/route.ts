import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;
  const body = await request.json();

  const plan = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!plan || plan.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const ALLOWED = ["name", "description", "price", "interval", "benefits", "maxMembers", "sortOrder", "isActive"];
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.membershipPlan.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;

  const plan = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!plan || plan.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // ソフトデリート（isActive=false）
  await prisma.membershipPlan.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
