import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SCORES } from "@/lib/scoring";

// GET /api/scoring-rules
export async function GET() {
  try {
    const authUser = await requireAdmin();
    const rules = await prisma.scoringRule.findMany({
      where: { templeId: authUser.templeId },
    });
    return NextResponse.json({ rules, defaults: DEFAULT_SCORES });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PUT /api/scoring-rules
// Body: { rules: { activityType: string; score: number }[] }
export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAdmin();
    const body = await request.json();
    const rules = body.rules as { activityType: string; score: number }[];

    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    // upsert each rule
    await prisma.$transaction(
      rules.map((r) =>
        prisma.scoringRule.upsert({
          where: { templeId_activityType: { templeId: authUser.templeId, activityType: r.activityType } },
          create: {
            templeId: authUser.templeId,
            activityType: r.activityType,
            score: r.score,
          },
          update: { score: r.score },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
