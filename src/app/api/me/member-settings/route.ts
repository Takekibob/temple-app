import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// PATCH /api/me/member-settings — 通知設定の更新
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: { member: { select: { id: true } } },
  });
  if (!user?.member) {
    return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
  }

  const body = await request.json();
  const allowed = ["notifyEvent", "notifyAnnouncement"] as const;
  const data: Partial<Record<(typeof allowed)[number], boolean>> = {};

  for (const key of allowed) {
    if (typeof body[key] === "boolean") {
      data[key] = body[key];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "NO_VALID_FIELDS" }, { status: 400 });
  }

  await prisma.member.update({
    where: { id: user.member.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
