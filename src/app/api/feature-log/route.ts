import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { logFeature } from "@/lib/featureLog";

// POST /api/feature-log — クライアントコンポーネントからの機能利用ログ
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { feature, action } = await request.json();
    if (!feature || !action) return NextResponse.json({ ok: false }, { status: 400 });
    await logFeature(authUser.templeId, authUser.id, feature, action);
    return NextResponse.json({ ok: true });
  } catch {
    // 認証エラーでも200を返す（ロギングの失敗でUX を壊さない）
    return NextResponse.json({ ok: false });
  }
}
