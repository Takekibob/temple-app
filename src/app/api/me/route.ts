import { NextResponse } from "next/server";
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
      member: { select: { id: true, type: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null }, { status: 404 });
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
