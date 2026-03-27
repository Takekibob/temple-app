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

  // 未認証ユーザーを /auth/login へリダイレクト
  if (!user && (pathname.startsWith("/app") || pathname.startsWith("/admin"))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // メール未確認ユーザーが /app に入ろうとしたらログインページへ
  if (user && !user.email_confirmed_at && pathname.startsWith("/app")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("error", "email_not_confirmed");
    return NextResponse.redirect(loginUrl);
  }

  // 認証済みユーザーがログイン/登録ページにアクセスしたら適切な画面へ
  // ロール判定はサーバーコンポーネント側で行うため、ここでは /app へ転送
  // （admin/staff は actions.ts のログイン処理で /admin にリダイレクト済み）
  if (
    user &&
    user.email_confirmed_at &&
    (pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/register"))
  ) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    return NextResponse.redirect(appUrl);
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
