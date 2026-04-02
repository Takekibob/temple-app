import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // パスワードリセット等、/auth/ 配下への明示的な誘導はそのまま優先
      if (next.startsWith("/auth/")) {
        return NextResponse.redirect(new URL(next, origin));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { role: true, isActive: true, member: { select: { id: true } } },
        });

        // アカウント無効
        if (dbUser && !dbUser.isActive) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/?error=account_disabled", origin));
        }

        // SUPER_ADMIN は member を持たないため先に処理
        if (dbUser?.role === "SUPER_ADMIN") {
          await prisma.user.update({
            where: { email: user.email },
            data: { lastLoginAt: new Date() },
          });
          return NextResponse.redirect(new URL("/superadmin", origin));
        }

        // DBユーザーなし or membersレコードなし → オンボーディングへ
        if (!dbUser || !dbUser.member) {
          return NextResponse.redirect(new URL("/auth/onboarding", origin));
        }

        // 管理者・スタッフ → 管理画面へ
        if (["ADMIN", "STAFF"].includes(dbUser.role)) {
          await prisma.user.update({
            where: { email: user.email },
            data: { lastLoginAt: new Date() },
          });
          return NextResponse.redirect(new URL("/admin", origin));
        }

        // 通常会員 → 最終ログイン更新してから next へ
        await prisma.user.update({
          where: { email: user.email },
          data: { lastLoginAt: new Date() },
        });
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/?error=callback", origin));
}
