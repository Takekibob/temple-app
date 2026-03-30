import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import type { Member, User } from "@/generated/prisma/client";

/**
 * 通常ユーザー（MEMBER/STAFF/ADMIN）は必ず templeId を持つ
 * SUPER_ADMIN は templeId = null だが専用の requireSuperAdmin() を使用する
 */
export type AuthUser = Omit<User, "templeId"> & {
  templeId: string;
  member: Member | null;
};

/** SUPER_ADMIN 専用型（templeId を持たない） */
export type SuperAdminUser = Omit<User, "templeId"> & {
  templeId: null;
  member: null;
};

/** requireAdmin/requireAdminOrStaff の戻り値型（後方互換） */
export type TempleAuthUser = AuthUser;

/**
 * Server Component 向け: 現在のログインユーザーと会員情報を取得
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { member: true },
  });

  if (!dbUser || !dbUser.isActive) return null;

  return dbUser as unknown as AuthUser | null;
}

/**
 * Server Action / Route Handler 向け: セッション確認
 */
export async function requireAuth() {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error("UNAUTHORIZED");
  }
  return authUser;
}

/**
 * 管理者権限チェック（お寺に紐づく ADMIN のみ）
 * SUPER_ADMIN はお寺を持たないため /superadmin/* を使用
 */
export async function requireAdmin(): Promise<TempleAuthUser> {
  const authUser = await requireAuth();
  if (authUser.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  if (!authUser.templeId) {
    throw new Error("FORBIDDEN");
  }
  return authUser;
}

/**
 * 管理者 or スタッフ権限チェック（お寺に紐づくロールのみ）
 * CANCELLED / SUSPENDED テナントは PAYMENT_REQUIRED を返す
 */
export async function requireAdminOrStaff(): Promise<TempleAuthUser> {
  const authUser = await requireAuth();
  if (!["ADMIN", "STAFF"].includes(authUser.role)) {
    throw new Error("FORBIDDEN");
  }
  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { planStatus: true },
  });
  if (temple?.planStatus === "CANCELLED" || temple?.planStatus === "SUSPENDED") {
    throw new Error("PAYMENT_REQUIRED");
  }
  return authUser;
}

/**
 * SUPER_ADMIN 専用権限チェック（プラットフォーム運営者のみ）
 */
export async function requireSuperAdmin(): Promise<SuperAdminUser> {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return authUser as unknown as SuperAdminUser;
}
