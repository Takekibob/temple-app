import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNenkiDeathYearsForYear } from "@/lib/nenki";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") ?? "all"; // all | monthly | annual
    const search = searchParams.get("search") ?? "";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

    const baseWhere = {
      member: { templeId: authUser.templeId },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { kaimyo: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const include = {
      member: { include: { user: { select: { name: true } } } },
    };

    if (tab === "monthly") {
      // 命日月フィルター: deathDate のある全件を取得して JS でフィルタ
      const targetMonth = month ?? new Date().getMonth() + 1;
      const all = await prisma.deceasedPerson.findMany({
        where: { ...baseWhere, deathDate: { not: null } },
        orderBy: [{ deathDate: "asc" }],
        include,
      });
      const filtered = all.filter(
        (d) => d.deathDate && d.deathDate.getMonth() + 1 === targetMonth
      );
      return NextResponse.json({ deceased: filtered, total: filtered.length, tab });
    }

    if (tab === "annual") {
      // 今年の年忌: 没年が nenki 対象年に一致するレコードを OR で取得
      const deathYears = getNenkiDeathYearsForYear(year);
      const all = await prisma.deceasedPerson.findMany({
        where: {
          ...baseWhere,
          deathDate: { not: null },
          OR: deathYears.map((dy) => ({
            deathDate: {
              gte: new Date(`${dy}-01-01`),
              lt: new Date(`${dy + 1}-01-01`),
            },
          })),
        },
        orderBy: [{ deathDate: "asc" }],
        include,
      });
      return NextResponse.json({ deceased: all, total: all.length, tab, year });
    }

    // tab === "all"
    const [deceased, total] = await Promise.all([
      prisma.deceasedPerson.findMany({
        where: baseWhere,
        orderBy: [{ deathDate: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include,
      }),
      prisma.deceasedPerson.count({ where: baseWhere }),
    ]);

    return NextResponse.json({ deceased, total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, name, kaimyo, deathDate, age, relationship, notes } = body;

    if (!memberId || !name || !deathDate) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (name.length > 50) {
      return NextResponse.json({ error: "故人名は50文字以内で入力してください" }, { status: 400 });
    }
    if (kaimyo && kaimyo.length > 100) {
      return NextResponse.json({ error: "戒名は100文字以内で入力してください" }, { status: 400 });
    }
    const deathDateObj = new Date(deathDate);
    if (deathDateObj > new Date()) {
      return NextResponse.json({ error: "没年月日に未来の日付は指定できません" }, { status: 400 });
    }

    // 会員が temple に属する檀家か確認
    const member = await prisma.member.findFirst({
      where: { id: memberId, templeId: authUser.templeId, type: "DANKA" },
    });
    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません（檀家会員のみ登録できます）" }, { status: 404 });
    }

    const deceased = await prisma.deceasedPerson.create({
      data: {
        memberId,
        name,
        kaimyo: kaimyo || null,
        deathDate: deathDateObj,
        age: age ? parseInt(age) : null,
        relationship: relationship || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ deceased }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
