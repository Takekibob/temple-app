import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// POST /api/staff/invite
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { email, role, name } = await request.json();
    if (!email || !role || !["ADMIN", "STAFF"].includes(role)) {
      return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
    }

    // 既存ユーザーチェック
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

    // Supabase Auth にユーザーを招待
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/accept-invite`,
        data: { name: name || email.split("@")[0] },
      }
    );

    if (inviteError || !inviteData.user) {
      return NextResponse.json(
        { error: inviteError?.message ?? "招待に失敗しました" },
        { status: 500 }
      );
    }

    // Prisma に users レコードを作成
    const displayName = name?.trim() || email.split("@")[0];
    await prisma.user.create({
      data: {
        id: inviteData.user.id,
        templeId: authUser.templeId,
        email,
        name: displayName,
        role: role as "ADMIN" | "STAFF",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
