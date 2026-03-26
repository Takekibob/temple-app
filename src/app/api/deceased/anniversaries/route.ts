import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcNenki, getNenkiDeathYearsForYear } from "@/lib/nenki";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

    const deathYears = getNenkiDeathYearsForYear(year);

    const deceased = await prisma.deceasedPerson.findMany({
      where: {
        member: { templeId: authUser.templeId },
        deathDate: { not: null },
        OR: deathYears.map((dy) => ({
          deathDate: {
            gte: new Date(`${dy}-01-01`),
            lt: new Date(`${dy + 1}-01-01`),
          },
        })),
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
      orderBy: { deathDate: "asc" },
    });

    // 各故人に「今年の年忌名」を付加
    const result = deceased.map((d) => {
      const nenki = calcNenki(d.deathDate!).find((e) => e.year === year);
      return {
        ...d,
        nenkiName: nenki?.name ?? null,
        nenkiDate: nenki?.date ?? null,
      };
    });

    return NextResponse.json({ year, anniversaries: result });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
