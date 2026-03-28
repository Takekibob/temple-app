import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // DANKA | GOEN
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

    const where = {
      templeId: authUser.templeId,
      ...(type === "DANKA" || type === "GOEN" ? { type: type as "DANKA" | "GOEN" } : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search, mode: "insensitive" as const } } },
              { familyName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.member.count({ where }),
    ]);

    return NextResponse.json({ members, total, page, pageSize: PAGE_SIZE });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();
    const body = await request.json();
    const { name, email, type, familyName, phone, address, postalCode, notes } = body;

    if (!name || !email || !type || !familyName) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
    }
    if (name.length > 100 || familyName.length > 100) {
      return NextResponse.json({ error: "名前は100文字以内で入力してください" }, { status: 400 });
    }
    if (!["DANKA", "GOEN"].includes(type)) {
      return NextResponse.json({ error: "会員種別が不正です" }, { status: 400 });
    }

    // User レコード作成
    const user = await prisma.user.create({
      data: {
        templeId: authUser.templeId,
        name,
        email,
        role: "MEMBER",
      },
    });

    const member = await prisma.member.create({
      data: {
        templeId: authUser.templeId,
        userId: user.id,
        type,
        familyName,
        phone: phone || undefined,
        address: address || undefined,
        postalCode: postalCode || undefined,
        notes: notes || undefined,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
