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
  const { memberType, name, familyName, address, phone, interestTags, templeId: selectedTempleId } = body as {
    memberType: string;
    name: string;
    familyName?: string;
    address?: string;
    phone?: string;
    interestTags?: string[];
    templeId?: string;
  };

  if (!memberType || !name?.trim()) {
    return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
  }
  if (memberType === "DANKA" && (!familyName?.trim() || !address?.trim() || !phone?.trim())) {
    return NextResponse.json({ error: "檀家登録には家名・住所・電話番号が必要です" }, { status: 400 });
  }
  if (memberType === "DANKA" && !selectedTempleId) {
    return NextResponse.json({ error: "所属するお寺を選択してください" }, { status: 400 });
  }

  try {
    // Userレコードにはデフォルト寺院（最初の寺院）を設定
    const defaultTemple = await prisma.temple.findFirst({ where: { isActive: true } });
    if (!defaultTemple) {
      return NextResponse.json({ error: "寺院情報が見つかりません" }, { status: 500 });
    }

    // 檀家の場合は指定された寺院を検証
    let memberTempleId: string | null = null;
    if (memberType === "DANKA" && selectedTempleId) {
      const selectedTemple = await prisma.temple.findFirst({
        where: { id: selectedTempleId, isActive: true },
      });
      if (!selectedTemple) {
        return NextResponse.json({ error: "指定されたお寺が見つかりません" }, { status: 400 });
      }
      memberTempleId = selectedTempleId;
    }
    // ご縁さんは templeId = null

    // DBユーザーを取得 or 作成
    let dbUser = await prisma.user.findUnique({ where: { email: user.email } });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          templeId: memberTempleId ?? defaultTemple.id,
          email: user.email,
          name: name.trim(),
          role: "MEMBER",
          authProvider: AuthProvider.GOOGLE,
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

    const type = memberType === "DANKA" ? MemberType.DANKA : MemberType.GOEN;

    await prisma.member.create({
      data: {
        templeId: memberTempleId,  // 檀家: 選択寺院, ご縁さん: null
        userId: dbUser.id,
        type,
        familyName: type === MemberType.DANKA ? familyName!.trim() : (familyName?.trim() || name.trim()),
        address: type === MemberType.DANKA ? address!.trim() : undefined,
        phone: type === MemberType.DANKA ? phone!.trim() : undefined,
        interestTags:
          type === MemberType.GOEN && Array.isArray(interestTags) && interestTags.length > 0
            ? interestTags
            : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/onboarding]", err);
    return NextResponse.json({ error: "登録に失敗しました。もう一度お試しください。" }, { status: 500 });
  }
}
