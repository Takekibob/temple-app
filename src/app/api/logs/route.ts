import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/logs?page=1&action=create&targetType=member
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 50;
    const action = searchParams.get("action") ?? undefined;
    const targetType = searchParams.get("targetType") ?? undefined;

    const where = {
      templeId: authUser.templeId,
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, pageSize });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (msg === "PAYMENT_REQUIRED") return NextResponse.json({ error: "PAYMENT_REQUIRED" }, { status: 402 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
