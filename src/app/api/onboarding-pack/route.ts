import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  // 既存のパックがあれば返す（重複申込防止）
  const existing = await prisma.onboardingPack.findFirst({
    where: { templeId: authUser.templeId },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.status !== "COMPLETED") {
    return NextResponse.json(existing, { status: 200 });
  }

  const pack = await prisma.onboardingPack.create({
    data: {
      templeId: authUser.templeId,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(pack, { status: 201 });
}
