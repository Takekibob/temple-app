import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { validatePhone } from "@/lib/memberValidation";

const ALLOWED_FIELDS = [
  "name", "denomination", "address", "phone", "email",
  "websiteUrl", "instagramUrl", "lineOfficialUrl", "youtubeUrl",
  "description", "customEventCategories",
  "prefecture", "onlinePaymentEnabled",
] as const;

// GET /api/settings
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const temple = await prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: {
        id: true, name: true, denomination: true, address: true, phone: true,
        email: true, websiteUrl: true, instagramUrl: true, lineOfficialUrl: true, youtubeUrl: true,
        logoUrl: true, description: true, customEventCategories: true,
        stripeConnectAccountId: true, stripeConnectOnboarded: true,
      },
    });

    if (!temple) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(temple);
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PATCH /api/settings
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });
    }
    if (typeof data.phone === "string" && data.phone) {
      const phoneErr = validatePhone(data.phone);
      if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });
    }

    const temple = await prisma.temple.update({
      where: { id: authUser.templeId },
      data,
    });

    logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "update",
      targetType: "settings",
      detail: { updated: Object.keys(data) },
    });

    return NextResponse.json(temple);
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
