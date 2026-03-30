import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;

  const pack = await prisma.onboardingPack.findUnique({ where: { id } });
  if (!pack || pack.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(pack);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SUPER_ADMINのみ更新可能
  await requireSuperAdmin();
  const { id } = await params;
  const body = await request.json();

  const pack = await prisma.onboardingPack.findUnique({ where: { id } });
  if (!pack) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const ALLOWED = [
    "status",
    "hearingDone", "hearingDate", "hearingNotes",
    "dataEntryDone", "dataEntryCount",
    "lineSetupDone", "trainingDone", "trainingDate",
    "supportEndsAt", "paidAmount", "paidAt", "notes",
  ];
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.onboardingPack.update({ where: { id }, data });
  return NextResponse.json(updated);
}
