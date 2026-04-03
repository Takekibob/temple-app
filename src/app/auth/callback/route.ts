import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (!code) {
    return NextResponse.redirect(new URL("/?error=callback", origin));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error("[auth/callback] exchangeCodeForSession error:", sessionError.message);
      return NextResponse.redirect(new URL("/?error=callback", origin));
    }

    // パスワードリセット等、/auth/ 配下への明示的な誘導はそのまま優先
    if (next.startsWith("/auth/")) {
      return NextResponse.redirect(new URL(next, origin));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.redirect(new URL("/auth/onboarding", origin));
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true, isActive: true, member: { select: { id: true } } },
    });

    // アカウント無効
    if (dbUser && !dbUser.isActive) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/?error=account_disabled", origin));
    }

    // DBユーザーなし or membersレコードなし → オンボーディングへ
    if (!dbUser || !dbUser.member) {
      return NextResponse.redirect(new URL("/auth/onboarding", origin));
    }

    // 最終ログイン日時を更新（失敗しても認証自体は通す）
    prisma.user.update({
      where: { email: user.email },
      data: { lastLoginAt: new Date() },
    }).catch((e) => console.error("[auth/callback] lastLoginAt update failed:", e));

    // SUPER_ADMIN
    if (dbUser.role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin", origin));
    }
    // 管理者・スタッフ
    if (["ADMIN", "STAFF"].includes(dbUser.role)) {
      return NextResponse.redirect(new URL("/admin", origin));
    }
    // 通常会員
    return NextResponse.redirect(new URL(next, origin));

  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/?error=callback", origin));
  }
}
