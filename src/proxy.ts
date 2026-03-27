import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 未認証ユーザーを / (ログイン画面) へリダイレクト
  if (!user && (pathname.startsWith("/app") || pathname.startsWith("/admin"))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // メール未確認ユーザーが /app に入ろうとしたらログインページへ
  if (user && !user.email_confirmed_at && pathname.startsWith("/app")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("error", "email_not_confirmed");
    return NextResponse.redirect(loginUrl);
  }

  // 認証済みユーザーがログイン(/)または登録ページにアクセスしたら適切な画面へ
  if (
    user &&
    user.email_confirmed_at &&
    (pathname === "/" ||
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/register"))
  ) {
    // ロール・member有無を確認してリダイレクト先を決定
    const { prisma } = await import("@/lib/prisma");
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { role: true, isActive: true, member: { select: { id: true } } },
    });

    const destUrl = request.nextUrl.clone();

    if (!dbUser) {
      // OAuthで認証済みだがDBレコードなし → オンボーディングへ
      destUrl.pathname = "/auth/onboarding";
    } else if (!dbUser.isActive) {
      // 無効化アカウントはリダイレクトせずログインページに留める
      return supabaseResponse;
    } else if (!dbUser.member && dbUser.role === "MEMBER") {
      // DBユーザーはあるがmembersレコードなし → オンボーディングへ
      destUrl.pathname = "/auth/onboarding";
    } else if (["ADMIN", "SUPER_ADMIN", "STAFF"].includes(dbUser.role)) {
      destUrl.pathname = "/admin";
    } else {
      destUrl.pathname = "/app";
    }
    return NextResponse.redirect(destUrl);
  }

  // /setup は認証済みの場合は /admin へリダイレクト
  // （未認証の場合はページ側で DB チェックして判断）
  if (user && user.email_confirmed_at && pathname === "/setup") {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    return NextResponse.redirect(adminUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
