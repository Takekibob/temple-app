import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/superadmin/migrate/sync-stages
 *
 * Phase C 初期同期: type=DANKA のメンバーを stage=DANKA に統一する。
 * type=GOEN のメンバーはスコアに応じて stage を初期化する（10pt以上→PROSPECT など）。
 * 冪等: 既に stage=DANKA のメンバーには触れない。
 */
export async function POST() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // type=DANKA で stage≠DANKA のメンバーを DANKA に統一
  const dankaResult = await prisma.member.updateMany({
    where: { type: "DANKA", stage: { not: "DANKA" } },
    data: { stage: "DANKA", stageChangedAt: new Date(), stageChangedBy: "MIGRATE" },
  });

  // type=GOEN で lifetimeScore に基づき stage を初期化
  // スコア 0-9: GOEN（変更不要）
  // スコア 10-49: PROSPECT
  // スコア 50+: DANKA_CANDIDATE
  const prospectResult = await prisma.member.updateMany({
    where: {
      type: "GOEN",
      stage: "GOEN",
      lifetimeScore: { gte: 10, lt: 50 },
    },
    data: { stage: "PROSPECT", stageChangedAt: new Date(), stageChangedBy: "MIGRATE" },
  });

  const candidateResult = await prisma.member.updateMany({
    where: {
      type: "GOEN",
      stage: { in: ["GOEN", "PROSPECT"] },
      lifetimeScore: { gte: 50 },
    },
    data: { stage: "DANKA_CANDIDATE", stageChangedAt: new Date(), stageChangedBy: "MIGRATE" },
  });

  return NextResponse.json({
    ok: true,
    synced: {
      dankaTypeToStage: dankaResult.count,
      goenToProspect: prospectResult.count,
      goenToDankaCandidate: candidateResult.count,
    },
  });
}
