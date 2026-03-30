import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { changeStage } from "@/lib/scoring";
import { MemberStage } from "@/generated/prisma/client";

const VALID_STAGES: MemberStage[] = ["GOEN", "PROSPECT", "DANKA_CANDIDATE", "DANKA"];

// POST /api/members/stage
// Body: { memberId: string; toStage: MemberStage; reason?: string }
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();
    const body = await request.json();
    const { memberId, toStage, reason } = body as {
      memberId: string;
      toStage: MemberStage;
      reason?: string;
    };

    if (!memberId || !VALID_STAGES.includes(toStage)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    await changeStage({
      memberId,
      toStage,
      triggeredBy: authUser.id,
      reason,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (msg === "PAYMENT_REQUIRED") return NextResponse.json({ error: "PAYMENT_REQUIRED" }, { status: 402 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
