import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Supabase SSR: セッショントークンをリフレッシュしつつ cookie を伝播させる
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

  // ⚠️ createServerClient と getUser() の間にコードを追加しないこと
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 未認証ユーザーが保護されたルートにアクセスした場合はログインへ
  if (!user) {
    if (pathname.startsWith("/admin") || pathname.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ロールベースのリダイレクトはサーバーコンポーネント/レイアウトで処理
  // （middleware では Prisma/DB アクセス不可）

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 静的ファイル・API ルートは除外
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
