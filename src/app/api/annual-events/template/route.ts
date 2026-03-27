import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface TemplateItem {
  name: string;
  month: number;
  day: number;
  endDay?: number;
  description?: string;
}

// POST /api/annual-events/template
// Body: { items: TemplateItem[] }
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const items: TemplateItem[] = body.items ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
    }

    const created = await prisma.annualEvent.createMany({
      data: items.map((item) => ({
        templeId: authUser.templeId,
        name: item.name,
        month: item.month,
        day: item.day,
        endDay: item.endDay ?? null,
        description: item.description ?? null,
        isRecurring: true,
        showOnCalendar: true,
      })),
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
