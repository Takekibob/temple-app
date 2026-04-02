import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const authUser = await requireAdminOrStaff();
  const blocks = await prisma.reservationBlock.findMany({
    where: { templeId: authUser.templeId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ blocks });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdminOrStaff();
  const { date, startTime, endTime, reason } = await request.json();

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "日付は YYYY-MM-DD 形式で指定してください" }, { status: 400 });
  }

  const block = await prisma.reservationBlock.create({
    data: { templeId: authUser.templeId, date, startTime: startTime || null, endTime: endTime || null, reason: reason || null },
  });
  return NextResponse.json({ block }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authUser = await requireAdminOrStaff();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const block = await prisma.reservationBlock.findFirst({ where: { id, templeId: authUser.templeId } });
  if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reservationBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
