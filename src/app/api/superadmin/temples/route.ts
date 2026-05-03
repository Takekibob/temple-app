import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { sendWelcomeEmail } from "@/lib/email";
import { validatePhone } from "@/lib/memberValidation";

// POST /api/superadmin/temples — SUPER_ADMIN による新規寺院 + ADMIN アカウント作成
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireSuperAdmin();

    const { templeName, denomination, address, phone, adminName, adminEmail, adminPassword } =
      await request.json();

    if (!templeName || !address || !phone || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });

    const supabaseAdmin = createAdminSupabaseClient();

    // ── 1. Supabase Auth にADMINユーザーを作成 ─────────────────────────
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
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
        { error: `アカウントの作成に失敗しました: ${authError?.message ?? "不明"}` },
        { status: 500 }
      );
    }

    // ── 2. 寺院レコードを作成 ──────────────────────────────────────────
    const temple = await prisma.temple.create({
      data: {
        name: templeName.trim(),
        denomination: denomination?.trim() || null,
        address: address.trim(),
        phone: phone.trim(),
      },
    });

    // ── 3. Prisma User レコードを作成 ─────────────────────────────────
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        templeId: temple.id,
        email: adminEmail.toLowerCase(),
        name: adminName.trim(),
        role: "ADMIN",
      },
    });

    // ── 4. Member レコードを作成 ──────────────────────────────────────
    await prisma.member.create({
      data: {
        templeId: temple.id,
        userId: user.id,
        type: "DANKA",
        familyName: adminName.trim(),
      },
    });

    // ウェルカムメール送信（失敗しても無視）
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app"}/admin`;
    sendWelcomeEmail({
      to: adminEmail.toLowerCase(),
      adminName: adminName.trim(),
      templeName: templeName.trim(),
      loginUrl,
    }).catch(() => {});

    // 操作ログに記録
    await prisma.superAdminLog.create({
      data: {
        adminId: authUser.id,
        action: "TEMPLE_CREATE",
        targetType: "TEMPLE",
        targetId: temple.id,
        detail: `${templeName} (${adminEmail})`,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, templeId: temple.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/superadmin/temples]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
