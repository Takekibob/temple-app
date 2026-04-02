import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/members/[id]/change-request — 檀家情報の変更申請
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.member) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;

    // 自分のメンバーIDのみ
    if (authUser.member.id !== id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (!authUser.templeId) {
      return NextResponse.json({ error: "TEMPLE_NOT_FOUND" }, { status: 400 });
    }

    // 既にPENDINGの申請がある場合は拒否
    const existing = await prisma.memberChangeRequest.findFirst({
      where: { memberId: id, status: "PENDING" },
    });
    if (existing) {
      return NextResponse.json({ error: "ALREADY_PENDING" }, { status: 409 });
    }

    const body = await request.json();
    const { familyName, address, postalCode, phone, email } = body;

    // 少なくとも1フィールドが必要
    const requestData: Record<string, string> = {};
    if (familyName !== undefined) requestData.familyName = familyName;
    if (address !== undefined) requestData.address = address;
    if (postalCode !== undefined) requestData.postalCode = postalCode;
    if (phone !== undefined) requestData.phone = phone;
    if (email !== undefined) requestData.email = email;

    if (Object.keys(requestData).length === 0) {
      return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });
    }

    const changeRequest = await prisma.memberChangeRequest.create({
      data: {
        memberId: id,
        templeId: authUser.templeId,
        requestData,
      },
    });

    return NextResponse.json({ changeRequest }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
