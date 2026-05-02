import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/memberships?memberId=xxx — 会員のMembership一覧
export async function GET(request: Request) {
  try {
    const authUser = await requireAdminOrStaff();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId は必須です" }, { status: 400 });
    }

    // templeId スコープ確認
    const member = await prisma.member.findFirst({
      where: { id: memberId, templeId: authUser.templeId },
    });
    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const memberships = await prisma.membership.findMany({
      where: { memberId },
      include: {
        membershipType: { select: { id: true, name: true, pricingModel: true, description: true } },
        currentStage: { select: { id: true, name: true, order: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({ memberships });
  } catch (err) {
    console.error("[GET /api/memberships]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/memberships — 会員をMembershipTypeに追加
export async function POST(request: Request) {
  try {
    const authUser = await requireAdminOrStaff();
    const body = await request.json();
    const { memberId, membershipTypeId, stageId } = body;

    if (!memberId || !membershipTypeId) {
      return NextResponse.json({ error: "memberId と membershipTypeId は必須です" }, { status: 400 });
    }

    // 両方とも同じ templeId に属することを確認
    const [member, membershipType] = await Promise.all([
      prisma.member.findFirst({ where: { id: memberId, templeId: authUser.templeId } }),
      prisma.membershipType.findFirst({ where: { id: membershipTypeId, templeId: authUser.templeId } }),
    ]);

    if (!member) return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    if (!membershipType) return NextResponse.json({ error: "メンバーシップ種別が見つかりません" }, { status: 404 });

    // 初期ステージを決定（指定がなければ最初のステージ）
    let resolvedStageId = stageId ?? null;
    if (!resolvedStageId) {
      const firstStage = await prisma.membershipStage.findFirst({
        where: { membershipTypeId },
        orderBy: { order: "asc" },
      });
      resolvedStageId = firstStage?.id ?? null;
    }

    const membership = await prisma.membership.upsert({
      where: { memberId_membershipTypeId: { memberId, membershipTypeId } },
      create: {
        memberId,
        membershipTypeId,
        templeId: authUser.templeId,
        currentStageId: resolvedStageId,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      update: {
        status: "ACTIVE",
        currentStageId: resolvedStageId,
      },
      include: {
        membershipType: { select: { id: true, name: true } },
        currentStage: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/memberships]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
