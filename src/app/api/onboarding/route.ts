import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { AuthProvider, MemberType } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { name, interestTags, templeId: selectedTempleId } = body as {
    name: string;
    interestTags?: string[];
    templeId?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
  }

  try {
    const type = MemberType.GOEN;

    const memberTempleId = selectedTempleId
      ? (await prisma.temple.findFirst({ where: { id: selectedTempleId, isActive: true } }))?.id ?? null
      : null;

    // DBユーザーを取得 or 作成
    let dbUser = await prisma.user.findUnique({ where: { email: user.email } });

    if (!dbUser) {
      // Supabase の app_metadata からプロバイダーを判定
      const provider = user.app_metadata?.provider;
      const authProvider =
        provider === "google" ? AuthProvider.GOOGLE :
        provider === "apple"  ? AuthProvider.APPLE  :
        provider === "line"   ? AuthProvider.LINE   :
        AuthProvider.EMAIL;

      // Userレコードにはデフォルト寺院（最初の寺院）を設定
      const defaultTemple = await prisma.temple.findFirst({ where: { isActive: true } });
      if (!defaultTemple) {
        return NextResponse.json({ error: "寺院情報が見つかりません" }, { status: 500 });
      }

      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          templeId: memberTempleId ?? defaultTemple.id,
          email: user.email,
          name: name.trim(),
          role: "MEMBER",
          authProvider,
          lastLoginAt: new Date(),
        },
      });
    } else {
      dbUser = await prisma.user.update({
        where: { email: user.email },
        data: {
          name: name.trim(),
          lastLoginAt: new Date(),
          ...(memberTempleId ? { templeId: memberTempleId } : {}),
        },
      });
    }

    // 既にmembersレコードがある場合はスキップ
    const existing = await prisma.member.findUnique({ where: { userId: dbUser.id } });
    if (existing) {
      return NextResponse.json({ ok: true });
    }

    await prisma.member.create({
      data: {
        templeId: memberTempleId,
        userId: dbUser.id,
        type,
        familyName: name.trim(),
        interestTags: Array.isArray(interestTags) && interestTags.length > 0 ? interestTags : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/onboarding]", err);
    return NextResponse.json({ error: "登録に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
