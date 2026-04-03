import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdminOrStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";

export async function GET(request: NextRequest) {
  const authUser = await requireAdminOrStaff();
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  const status = searchParams.get("status");

  const subscriptions = await prisma.memberSubscription.findMany({
    where: {
      templeId: authUser.templeId,
      ...(memberId ? { memberId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      member: { include: { user: { select: { name: true } } } },
    },
  });
  return NextResponse.json(subscriptions);
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth();
  if (!authUser.member) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
    return NextResponse.json({ error: "管理者・スタッフはプランへの加入ができません" }, { status: 403 });
  }
  const body = await request.json();
  const { planId } = body;

  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // 既存のアクティブなサブスクがあれば重複登録を防ぐ
  const existing = await prisma.memberSubscription.findFirst({
    where: { memberId: authUser.member.id, planId, status: "ACTIVE" },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_SUBSCRIBED" }, { status: 409 });
  }

  const subscription = await prisma.memberSubscription.create({
    data: {
      memberId: authUser.member.id,
      planId,
      templeId: plan.templeId,   // プランが属する寺院（自寺院以外でも可）
      status: "ACTIVE",
      currentPeriodStart: new Date(),
    },
  });

  logActivity({
    templeId: authUser.templeId,
    userId: authUser.id,
    action: "create",
    targetType: "subscription",
    targetId: subscription.id,
    detail: { planId, planName: plan.name },
  });

  return NextResponse.json(subscription, { status: 201 });
}
