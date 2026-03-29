import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// POST /api/superadmin/init — SUPER_ADMIN アカウントの初回作成
// セキュリティ:
//   1. SUPER_ADMIN_EMAIL 環境変数と一致するメールのみ受け付ける
//   2. SUPER_ADMIN がすでに存在する場合は 409 で拒否（一度限り）
export async function POST(request: NextRequest) {
  try {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    if (!superAdminEmail) {
      return NextResponse.json(
        { error: "SUPER_ADMIN_EMAIL が設定されていません" },
        { status: 503 }
      );
    }

    // ── ガード 1: すでに SUPER_ADMIN が存在する場合は拒否 ──────────────
    const existing = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "SUPER_ADMIN はすでに登録されています" },
        { status: 409 }
      );
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    // ── ガード 2: SUPER_ADMIN_EMAIL と一致するメールのみ受け付ける ──────
    if (email.toLowerCase() !== superAdminEmail) {
      return NextResponse.json(
        { error: "このメールアドレスは SUPER_ADMIN として登録できません" },
        { status: 403 }
      );
    }

    // ── 1. Supabase Auth にユーザーを作成 ─────────────────────────────
    const supabaseAdmin = createAdminSupabaseClient();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      if (authError?.message?.includes("already registered")) {
        return NextResponse.json(
          { error: "このメールアドレスは既に使用されています" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "アカウントの作成に失敗しました" },
        { status: 500 }
      );
    }

    // ── 2. Prisma User レコードを作成（templeId = null）────────────────
    await prisma.user.create({
      data: {
        id: authData.user.id,
        templeId: null, // SUPER_ADMIN は特定のお寺に属さない
        email: email.toLowerCase(),
        name: name.trim(),
        role: "SUPER_ADMIN",
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[/api/superadmin/init]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// GET /api/superadmin/init — SUPER_ADMIN セットアップが必要かどうかを返す
export async function GET() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  return NextResponse.json({
    needsInit: !existing,
    configured: !!superAdminEmail,
  });
}
