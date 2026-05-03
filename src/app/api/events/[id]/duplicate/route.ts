import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const source = await prisma.event.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!source) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;

    const newEvent = await prisma.event.create({
      data: {
        ...rest,
        title: `${source.title}（コピー）`,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ event: newEvent }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "複製に失敗しました" }, { status: 500 });
  }
}
