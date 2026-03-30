import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = await requireAdmin();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

  const [requests, total] = await Promise.all([
    prisma.ocrRequest.findMany({
      where: { templeId: authUser.templeId },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ocrRequest.count({ where: { templeId: authUser.templeId } }),
  ]);

  return NextResponse.json({ requests, total });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin();
  const body = await request.json();
  const { requestType, fileUrls, notes } = body;

  if (!requestType || !fileUrls?.length) {
    return NextResponse.json({ error: "requestType and fileUrls are required" }, { status: 400 });
  }

  const ocrRequest = await prisma.ocrRequest.create({
    data: {
      templeId: authUser.templeId,
      requestType,
      fileUrls,
      notes: notes || null,
      submittedBy: authUser.id,
      status: "SUBMITTED",
    },
  });

  return NextResponse.json(ocrRequest, { status: 201 });
}
