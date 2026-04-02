import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrStaff } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdminOrStaff();
  const { id } = await params;

  const seq = await prisma.lineStepSequence.findUnique({ where: { id } });
  if (!seq || seq.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(seq);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;
  const body = await request.json();

  const seq = await prisma.lineStepSequence.findUnique({ where: { id } });
  if (!seq || seq.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const ALLOWED = ["name", "trigger", "steps", "isActive"];
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.lineStepSequence.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;

  const seq = await prisma.lineStepSequence.findUnique({ where: { id } });
  if (!seq || seq.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.lineStepSequence.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
