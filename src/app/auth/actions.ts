"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

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
    // Google 等 OAuth ユーザーがメール/パスワードでログインしようとした場合に案内
    const dbUser = await prisma.user.findUnique({ where: { email }, select: { authProvider: true } });
    if (dbUser?.authProvider === "GOOGLE") {
      return { error: "このアカウントは Google でログインしています。Googleのログインボタンをお使いください。" };
    }
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  // DB にユーザーレコードがない or 無効化されている場合のチェック
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) {
    const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
    if (!dbUser) {
      await supabase.auth.signOut();
      return { error: "アカウントの登録が完了していません。お手数ですが再度新規登録をお試しください。" };
    }
    if (!dbUser.isActive) {
      await supabase.auth.signOut();
      return { error: "このアカウントは無効化されています。管理者にお問い合わせください。" };
    }
    // 最終ログイン日時を更新・スタッフ管理者は管理画面へ
    await prisma.user.update({ where: { email: authUser.email! }, data: { lastLoginAt: new Date() } });
    if (["ADMIN", "SUPER_ADMIN", "STAFF"].includes(dbUser.role)) {
      redirect("/admin");
    }
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

  // DB に既存ユーザーがいる場合はプロバイダーを確認
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { authProvider: true } });
  if (existingUser) {
    if (existingUser.authProvider === "GOOGLE") {
      return { error: "このメールアドレスは Google アカウントで登録されています。Googleのログインボタンをお使いください。" };
    }
    return { error: "このメールアドレスは既に登録されています。ログインしてください。" };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createServerSupabaseClient();

  // Supabase Auth にユーザー作成のみ（DB書き込みはオンボーディングで行う）
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  // 正常に新規ユーザーが作成された場合
  if (!signUpError && authData.user && (authData.user.identities?.length ?? 1) > 0) {
    return { success: true, email };
  }

  // それ以外（エラー・user:null・identities空）は既存未確認ユーザーの可能性が高い
  // resend で確認。resend が成功すればユーザーは存在するのでOTP画面へ進む
  const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
  if (!resendError) {
    return { success: true, email };
  }

  return { error: "登録に失敗しました。しばらく経ってから再度お試しください。" };
}

// ============================================================
// パスワードリセット（メール送信）
// ============================================================
export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "メールアドレスを入力してください。" };

  // DB に登録済みかチェック
  const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true, authProvider: true } });
  if (!dbUser) return { error: "このメールアドレスは登録されていません。" };

  // Google 等の OAuth ログインユーザーにはパスワードがない
  if (dbUser.authProvider !== "EMAIL") {
    const providerLabel = dbUser.authProvider === "GOOGLE" ? "Google" : dbUser.authProvider === "LINE" ? "LINE" : "外部サービス";
    return { error: `このアカウントは ${providerLabel} でログインしています。${providerLabel} のログインボタンからお進みください。` };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/new-password`,
  });

  if (error) return { error: "送信に失敗しました。しばらく経ってから再度お試しください。" };
  return { success: true };
}

// ============================================================
// OTPコード検証（新規登録）
// ============================================================
export async function verifySignupOtp(email: string, token: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
  if (error) {
    return { error: "コードが正しくないか、有効期限が切れています。再送信してお試しください。" };
  }
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true, member: { select: { id: true } } },
  });
  if (!dbUser || !dbUser.member) redirect("/auth/onboarding");
  redirect("/app");
}

// ============================================================
// 確認メール再送信
// ============================================================
export async function resendConfirmationEmail(email: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: "再送信に失敗しました。しばらく経ってから再度お試しください。" };
  return { success: true };
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
