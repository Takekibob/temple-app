import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import type { DisplayMode, FontSize } from "@/generated/prisma/client";

const VALID_DISPLAY_MODES: DisplayMode[] = ["STANDARD", "SIMPLE"];
const VALID_FONT_SIZES: FontSize[] = ["MEDIUM", "LARGE", "XLARGE"];

// PATCH /api/me/preferences — 表示設定変更（高齢者対策）
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json();
  const { displayMode, fontSize, highContrast } = body;

  if (displayMode !== undefined && !VALID_DISPLAY_MODES.includes(displayMode)) {
    return NextResponse.json({ error: "不正な displayMode 値です" }, { status: 400 });
  }
  if (fontSize !== undefined && !VALID_FONT_SIZES.includes(fontSize)) {
    return NextResponse.json({ error: "不正な fontSize 値です" }, { status: 400 });
  }

  const data: { displayMode?: DisplayMode; fontSize?: FontSize; highContrast?: boolean } = {};
  if (displayMode !== undefined) data.displayMode = displayMode as DisplayMode;
  if (fontSize !== undefined) data.fontSize = fontSize as FontSize;
  if (highContrast !== undefined) data.highContrast = Boolean(highContrast);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "更新するフィールドがありません" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { email: authUser.email },
    data,
    select: { displayMode: true, fontSize: true, highContrast: true },
  });

  return NextResponse.json({ preferences: updated });
}

// GET /api/me/preferences — 現在の表示設定を取得
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: authUser.email },
    select: { displayMode: true, fontSize: true, highContrast: true },
  });

  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ preferences: user });
}
