import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { awardScore } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  const authUser = await requireAdminOrStaff();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 30));
  const memberId = searchParams.get("memberId");
  const purpose = searchParams.get("purpose");

  const where = {
    templeId: authUser.templeId,
    ...(memberId ? { memberId } : {}),
    ...(purpose ? { purpose: purpose as never } : {}),
  };

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { donatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.donation.count({ where }),
  ]);

  const totalAmount = await prisma.donation.aggregate({
    where,
    _sum: { amount: true },
  });

  return NextResponse.json({ donations, total, totalAmount: totalAmount._sum.amount ?? 0 });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdminOrStaff();
  const body = await request.json();
  const { memberId, amount, purpose, purposeDetail, paymentMethod, donorName, donorEmail, notes, donatedAt } = body;

  if (!amount || !paymentMethod) {
    return NextResponse.json({ error: "amount and paymentMethod are required" }, { status: 400 });
  }

  const donation = await prisma.donation.create({
    data: {
      templeId: authUser.templeId,
      memberId: memberId || null,
      amount: Number(amount),
      purpose: purpose ?? "GENERAL",
      purposeDetail: purposeDetail || null,
      paymentMethod,
      donorName: donorName || null,
      donorEmail: donorEmail || null,
      notes: notes || null,
      donatedAt: donatedAt ? new Date(donatedAt) : new Date(),
    },
  });

  // スコア付与
  if (memberId) {
    const activityType = Number(amount) >= 10000 ? "DONATION_LARGE" : "DONATION";
    await awardScore({
      memberId,
      templeId: authUser.templeId,
      activityType,
      sourceId: donation.id,
    }).catch(() => {});
  }

  logActivity({
    templeId: authUser.templeId,
    userId: authUser.id,
    action: "create",
    targetType: "donation",
    targetId: donation.id,
    detail: { amount: Number(amount), purpose: purpose ?? "GENERAL", memberId },
  });

  return NextResponse.json(donation, { status: 201 });
}
