import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/line/generate-code — 6桁の連携コードを生成してDBに保存
export async function POST() {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.member) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // 1分間のクールダウン（同じユーザーによる連続生成を防止）
    if (authUser.member.lineCodeExpiresAt) {
      const generatedAt = new Date(authUser.member.lineCodeExpiresAt.getTime() - 10 * 60 * 1000);
      if (Date.now() - generatedAt.getTime() < 60 * 1000) {
        return NextResponse.json({ error: "コードの再生成は1分間隔でお試しください" }, { status: 429 });
      }
    }

    // 6桁ランダムコード（000000〜999999）
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分後

    await prisma.member.update({
      where: { id: authUser.member.id },
      data: { lineCode: code, lineCodeExpiresAt: expiresAt },
    });

    const addUrl = process.env.LINE_ADD_FRIEND_URL ?? "";
    return NextResponse.json({ code, addUrl });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
