"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// ============================================================
// ログイン (メール + パスワード)
// ============================================================
export async function loginWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message?.toLowerCase().includes("email not confirmed")) {
      return { error: "メールアドレスの認証が完了していません。登録時に届いたメールのリンクをクリックしてください。" };
    }
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  // DB にユーザーレコードがない or 無効化されている場合のチェック
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) {
    const { prisma } = await import("@/lib/prisma");
    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
    if (!dbUser) {
      await supabase.auth.signOut();
      return { error: "アカウントの登録が完了していません。お手数ですが再度新規登録をお試しください。" };
    }
    if (!dbUser.isActive) {
      await supabase.auth.signOut();
      return { error: "このアカウントは無効化されています。管理者にお問い合わせください。" };
    }
    // 最終ログイン日時を更新
    await prisma.user.update({ where: { email: authUser.email! }, data: { lastLoginAt: new Date() } });
  }

  // スタッフ・管理者は管理画面へ
  const { prisma } = await import("@/lib/prisma");
  const finalUser = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (finalUser && ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(finalUser.role)) {
    redirect("/admin");
  }

  redirect("/app");
}

// ============================================================
// 新規登録 (メール + パスワード)
// ============================================================
export async function registerWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "必須項目を入力してください。" };
  }

  const supabase = await createServerSupabaseClient();

  // Supabase Auth にユーザー作成のみ（DB書き込みはオンボーディングで行う）
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    },
  });

  if (signUpError || !authData.user) {
    if (signUpError?.message?.includes("already registered")) {
      return { error: "このメールアドレスは既に登録されています。" };
    }
    return { error: "登録に失敗しました。しばらく経ってから再度お試しください。" };
  }

  return { success: true, email };
}

// ============================================================
// Google ログイン (OAuth リダイレクト URL を返す)
// ============================================================
export async function getGoogleLoginUrl(next?: string) {
  const supabase = await createServerSupabaseClient();
  const redirectTo =
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback` +
    (next ? `?next=${encodeURIComponent(next)}` : "");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return { error: "Google ログインの準備に失敗しました。" };
  }

  return { url: data.url };
}

// ============================================================
// LINE ログイン (OAuth リダイレクト URL を返す)
// ============================================================
export async function getLineLoginUrl(next?: string) {
  const supabase = await createServerSupabaseClient();
  const redirectTo =
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback` +
    (next ? `?next=${encodeURIComponent(next)}` : "");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "line" as Parameters<typeof supabase.auth.signInWithOAuth>[0]["provider"],
    options: { redirectTo },
  });

  if (error || !data.url) {
    return { error: "LINE ログインの準備に失敗しました。" };
  }

  return { url: data.url };
}

// ============================================================
// ログアウト
// ============================================================
export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
