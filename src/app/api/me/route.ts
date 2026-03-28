import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: {
      id: true,
      role: true,
      isActive: true,
      member: { select: { id: true, type: true } },
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      role: user.role.toLowerCase(),
      memberType: user.member?.type?.toLowerCase() ?? null,
      memberId: user.member?.id ?? null,
    },
  });
}

// PATCH /api/me — 自分の氏名を更新
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: authUser.email },
    data: { name: name.trim() },
  });

  return NextResponse.json({ ok: true });
}
