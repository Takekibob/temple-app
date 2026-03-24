import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import type { Member, User } from "@/generated/prisma/client";

export type AuthUser = User & {
  member: Member | null;
};

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

  return dbUser as AuthUser | null;
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
 * 管理者権限チェック
 */
export async function requireAdmin() {
  const authUser = await requireAuth();
  if (!["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
    throw new Error("FORBIDDEN");
  }
  return authUser;
}

/**
 * 管理者 or スタッフ権限チェック
 */
export async function requireAdminOrStaff() {
  const authUser = await requireAuth();
  if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
    throw new Error("FORBIDDEN");
  }
  return authUser;
}
