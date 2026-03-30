import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrStaff } from "@/lib/auth";

export async function GET() {
  const authUser = await requireAdminOrStaff();
  const sequences = await prisma.lineStepSequence.findMany({
    where: { templeId: authUser.templeId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { queues: { where: { status: "PENDING" } } } },
    },
  });
  return NextResponse.json(sequences);
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin();
  const body = await request.json();
  const { name, trigger, steps } = body;

  if (!name || !trigger || !steps) {
    return NextResponse.json({ error: "name, trigger, steps are required" }, { status: 400 });
  }

  const sequence = await prisma.lineStepSequence.create({
    data: {
      templeId: authUser.templeId,
      name,
      trigger,
      steps,
    },
  });

  return NextResponse.json(sequence, { status: 201 });
}
