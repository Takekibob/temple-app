import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/temples — アクティブな寺院一覧（認証不要・オンボーディング用）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const denomination = searchParams.get("denomination");

  const where: Record<string, unknown> = { isActive: true };
  if (denomination) where.denomination = denomination;

  const temples = await prisma.temple.findMany({
    where,
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
      phone: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
    },
    orderBy: { name: "asc" },
  });

  const filtered = search
    ? temples.filter(
        (t) =>
          t.name.includes(search) ||
          (t.denomination ?? "").includes(search) ||
          (t.address ?? "").includes(search)
      )
    : temples;

  return NextResponse.json({ temples: filtered });
}
