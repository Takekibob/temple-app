import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logMemberActivity } from "@/lib/memberActivities";
import type { ActivityType } from "@/generated/prisma/enums";

const VALID_TYPES: ActivityType[] = [
  "LOGIN", "NEWS_VIEW", "EVENT_APPLY", "EVENT_ATTEND",
  "EVENT_FEEDBACK", "KUYO_APPLY", "CONTACT", "CONSECUTIVE_MONTH",
];

// POST /api/activities — クライアントからアクティビティを記録
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !authUser.member) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const { type, metadata } = body;

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    await logMemberActivity(authUser.member.id, type as ActivityType, metadata);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
