import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrStaff } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAdminOrStaff();
  const { id } = await params;

  const donation = await prisma.donation.findUnique({
    where: { id },
    include: { member: { include: { user: true } } },
  });
  if (!donation || donation.templeId !== authUser.templeId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const email = donation.donorEmail ?? donation.member?.user.email;
  if (!email) {
    return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });
  }

  // メール送信
  const { getResend, FROM_EMAIL } = await import("@/lib/email");
  const resend = getResend();
  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { name: true },
  });
  await resend.emails.send({
    from: `てらログ <${FROM_EMAIL}>`,
    to: email,
    subject: `【${temple?.name ?? "お寺"}】ご寄付ありがとうございました`,
    text: `
${donation.donorName ?? donation.member?.user.name ?? ""}様

このたびは¥${donation.amount.toLocaleString()}のご寄付をいただき、誠にありがとうございました。
${donation.purposeDetail ? `\n用途：${donation.purposeDetail}\n` : ""}
皆さまのあたたかいご支援に心より感謝申し上げます。

${temple?.name ?? "お寺"}
    `.trim(),
  });

  await prisma.donation.update({
    where: { id },
    data: { thankyouSent: true, thankyouSentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
