import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// POST /api/setup — 初期セットアップ（寺院 + 管理者アカウント作成）
export async function POST(request: NextRequest) {
  try {
    const { templeName, denomination, address, phone, adminName, email, password } =
      await request.json();

    if (!templeName || !address || !phone || !adminName || !email || !password) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    // ── 1. Supabase Auth にユーザーを作成（メール確認スキップ） ────────
    const supabaseAdmin = createAdminSupabaseClient();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // 招待メール不要・即時有効化
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

    // ── 2. 寺院レコードを新規作成 ──────────────────────────────────────
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const temple = await prisma.temple.create({
      data: {
        name: templeName.trim(),
        denomination: denomination?.trim() || null,
        address: address.trim(),
        phone: phone.trim(),
        planStatus: "TRIAL",
        trialEndsAt,
      },
    });

    // ── 3. Prisma users レコードを作成 ────────────────────────────────
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        templeId: temple.id,
        email: email.toLowerCase(),
        name: adminName.trim(),
        role: "ADMIN",
      },
    });

    // ── 4. Prisma members レコードを作成（住職も会員の一人） ──────────
    await prisma.member.create({
      data: {
        templeId: temple.id,
        userId: user.id,
        type: "DANKA",
        familyName: adminName.trim(),
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[/api/setup]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// GET /api/setup — (互換性のため残存)
export async function GET() {
  return NextResponse.json({ needsSetup: false });
}
