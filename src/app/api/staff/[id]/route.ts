import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// PATCH /api/staff/[id] — ロール変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    if (id === authUser.id) {
      return NextResponse.json({ error: "自分自身のロールは変更できません" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "SUPER_ADMINのロールは変更できません" }, { status: 403 });
    }

    const { role } = await request.json();
    if (!["ADMIN", "STAFF"].includes(role)) {
      return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as "ADMIN" | "STAFF" },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/staff/[id] — アカウント無効化（論理削除）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    if (id === authUser.id) {
      return NextResponse.json({ error: "自分自身を無効化することはできません" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!target) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "SUPER_ADMINは無効化できません" }, { status: 403 });
    }

    // Supabase Auth 側でもセッションを無効化
    const supabaseAdmin = createAdminSupabaseClient();
    await supabaseAdmin.auth.admin.deleteUser(id);

    // Prisma 側は isActive = false に
    await prisma.user.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
