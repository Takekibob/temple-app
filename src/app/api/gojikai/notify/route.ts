import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGojikaiReminderEmail } from "@/lib/email";

// POST /api/gojikai/notify — 未納の護持会費を持つ檀家にメール送信
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { fiscalYear } = await request.json();
    if (!fiscalYear) {
      return NextResponse.json({ error: "fiscalYear が必要です" }, { status: 400 });
    }

    const temple = await prisma.temple.findUnique({ where: { id: authUser.templeId } });
    if (!temple) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const unpaidPayments = await prisma.gojikaiPayment.findMany({
      where: {
        fiscalYear: parseInt(fiscalYear),
        status: "UNPAID",
        member: { templeId: authUser.templeId },
      },
      include: {
        member: { include: { user: { select: { email: true, name: true } } } },
      },
    });

    let sent = 0;
    let noEmail = 0;
    let failed = 0;
    let firstError = "";

    await Promise.allSettled(
      unpaidPayments.map(async (p) => {
        const email = p.member.user.email;
        if (!email) {
          noEmail++;
          return;
        }
        try {
          await sendGojikaiReminderEmail({
            to: email,
            memberName: p.member.user.name,
            templeName: temple.name,
            fiscalYear: p.fiscalYear,
            amount: p.amount,
          });
          sent++;
        } catch (err) {
          failed++;
          if (!firstError) {
            firstError = err instanceof Error ? err.message : String(err);
          }
        }
      })
    );

    return NextResponse.json({ sent, noEmail, failed, firstError: firstError || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
