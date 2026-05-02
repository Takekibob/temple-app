/**
 * メンバーシップ判定ユーティリティ
 *
 * 旧来の isDanka / isGoen (member.type) に代わる関数群。
 * すべての判定は Membership モデルを基準にする。
 */

import { prisma } from "@/lib/prisma";

/**
 * 指定会員がいずれかのMembershipTypeに加入しているか（ACTIVE のみ）
 */
export async function hasActiveMembership(
  memberId: string,
  templeId: string
): Promise<boolean> {
  const count = await prisma.membership.count({
    where: { memberId, templeId, status: "ACTIVE" },
  });
  return count > 0;
}

/**
 * 会員の有効なMembershipを全件取得
 */
export async function getActiveMemberships(memberId: string, templeId: string) {
  return prisma.membership.findMany({
    where: { memberId, templeId, status: "ACTIVE" },
    include: {
      membershipType: { select: { id: true, name: true, pricingModel: true } },
      currentStage: { select: { id: true, name: true, order: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
}

/**
 * 指定MembershipTypeに加入しているか
 */
export async function hasMembershipOfType(
  memberId: string,
  membershipTypeId: string
): Promise<boolean> {
  const count = await prisma.membership.count({
    where: { memberId, membershipTypeId, status: "ACTIVE" },
  });
  return count > 0;
}

/**
 * お寺の全MembershipTypeを取得
 */
export async function getMembershipTypes(templeId: string) {
  return prisma.membershipType.findMany({
    where: { templeId },
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * 旧来の isDanka 互換: いずれかのMembershipに加入済みなら true
 * 段階的移行用。新規コードでは hasActiveMembership を直接使うこと。
 */
export async function isMember(
  memberId: string | undefined,
  templeId: string | undefined
): Promise<boolean> {
  if (!memberId || !templeId) return false;
  return hasActiveMembership(memberId, templeId);
}
