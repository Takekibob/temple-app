import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;

  const ocrRequest = await prisma.ocrRequest.findUnique({ where: { id } });
  if (!ocrRequest || ocrRequest.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(ocrRequest);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdmin();
  const { id } = await params;
  const body = await request.json();

  const ocrRequest = await prisma.ocrRequest.findUnique({ where: { id } });
  if (!ocrRequest || ocrRequest.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const ALLOWED = ["status", "extractedData", "notes", "processedBy"];
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.ocrRequest.update({ where: { id }, data });
  return NextResponse.json(updated);
}
