import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/membership-types — お寺のMembershipType一覧
export async function GET() {
  try {
    const authUser = await requireAdminOrStaff();

    const types = await prisma.membershipType.findMany({
      where: { templeId: authUser.templeId },
      include: {
        stages: { orderBy: { order: "asc" } },
        _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ membershipTypes: types });
  } catch (err) {
    console.error("[GET /api/membership-types]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/membership-types — 新規作成
export async function POST(request: Request) {
  try {
    const authUser = await requireAdminOrStaff();
    const body = await request.json();
    const { name, description, pricingModel, priceJpy, billingCycle, isPublic, stages } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "名称は必須です" }, { status: 400 });
    }

    // 同名チェック
    const existing = await prisma.membershipType.findFirst({
      where: { templeId: authUser.templeId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: "同じ名称のメンバーシップが既に存在します" }, { status: 409 });
    }

    const count = await prisma.membershipType.count({
      where: { templeId: authUser.templeId },
    });

    const membershipType = await prisma.membershipType.create({
      data: {
        templeId: authUser.templeId,
        name: name.trim(),
        description: description?.trim() || null,
        pricingModel: pricingModel ?? "FREE",
        priceJpy: priceJpy ?? null,
        billingCycle: billingCycle ?? null,
        isPublic: isPublic ?? true,
        sortOrder: count,
        stages: {
          create: (stages ?? []).map((s: { name: string; order: number; autoPromoteRules?: unknown }) => ({
            name: s.name,
            order: s.order,
            autoPromoteRules: s.autoPromoteRules ?? null,
          })),
        },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ membershipType }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/membership-types]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
