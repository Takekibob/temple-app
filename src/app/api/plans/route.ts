import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrStaff } from "@/lib/auth";
import { PLAN_TEMPLATES } from "@/lib/planTemplates";

const ALLOWED_TEMPLATE_KEYS = PLAN_TEMPLATES.map((t) => t.key);

export async function GET() {
  const authUser = await requireAdminOrStaff();
  const plans = await prisma.membershipPlan.findMany({
    where: { templeId: authUser.templeId, templateKey: { in: ALLOWED_TEMPLATE_KEYS } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
  });
  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin();
  const body = await request.json();
  const { templateKey, name, description, price, interval, benefits, maxMembers, sortOrder } = body;

  if (!name || price == null) {
    return NextResponse.json({ error: "name and price are required" }, { status: 400 });
  }

  if (templateKey && !ALLOWED_TEMPLATE_KEYS.includes(templateKey)) {
    return NextResponse.json({ error: "INVALID_TEMPLATE_KEY" }, { status: 400 });
  }

  const plan = await prisma.membershipPlan.create({
    data: {
      templeId: authUser.templeId,
      templateKey: templateKey ?? null,
      name,
      description,
      price: Number(price),
      interval: interval ?? "MONTHLY",
      benefits: benefits ?? null,
      maxMembers: maxMembers ? Number(maxMembers) : null,
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(plan, { status: 201 });
}
