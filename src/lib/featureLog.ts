import { prisma } from "@/lib/prisma";

/**
 * 機能利用ログを記録する（失敗しても例外をスローしない）
 */
export async function logFeature(
  templeId: string,
  userId: string,
  feature: string,
  action: string
): Promise<void> {
  try {
    await prisma.featureLog.create({
      data: { templeId, userId, feature, action },
    });
  } catch {
    // ロギングの失敗がメイン処理を妨げないよう握り潰す
  }
}
