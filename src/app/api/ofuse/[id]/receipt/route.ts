import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import React from "react";

const OFUSE_TYPE_LABELS: Record<string, string> = {
  HOUYO: "法要",
  GOJIKAI: "護持会費",
  KIFU: "寄付",
  EVENT_FEE: "イベント参加費",
  OTHER: "その他",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "現金",
  TRANSFER: "振込",
  ONLINE: "オンライン",
};

Font.register({
  family: "NotoSansJP",
  src: "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEi75vY0rw-oME.ttf",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    padding: 60,
    fontSize: 10,
    color: "#1c1917",
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: 8,
    color: "#44403c",
  },
  receiptNo: {
    fontSize: 9,
    color: "#78716c",
    textAlign: "right",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  label: {
    width: 100,
    color: "#78716c",
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
    marginVertical: 16,
  },
  amountBox: {
    borderWidth: 1,
    borderColor: "#d6d3d1",
    borderRadius: 4,
    padding: 16,
    marginVertical: 20,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 9,
    color: "#78716c",
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 28,
    color: "#1c1917",
    letterSpacing: 2,
  },
  amountUnit: {
    fontSize: 14,
    color: "#44403c",
  },
  footer: {
    marginTop: 40,
    fontSize: 9,
    color: "#a8a29e",
    textAlign: "center",
  },
  stamp: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  stampBox: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: "#d6d3d1",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  stampLabel: {
    fontSize: 8,
    color: "#a8a29e",
  },
});

function ReceiptDocument({
  templeName,
  memberName,
  amount,
  type,
  paymentMethod,
  paidAt,
  receiptNo,
}: {
  templeName: string;
  memberName: string;
  amount: number;
  type: string;
  paymentMethod: string;
  paidAt: Date;
  receiptNo: string;
}) {
  const dateStr = paidAt.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.receiptNo }, `No. ${receiptNo}`),
      React.createElement(Text, { style: styles.title }, "領  収  書"),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "宛名"),
        React.createElement(Text, { style: styles.value }, `${memberName} 様`)
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(
        View,
        { style: styles.amountBox },
        React.createElement(Text, { style: styles.amountLabel }, "金額"),
        React.createElement(
          View,
          { style: { flexDirection: "row", alignItems: "flex-end" } },
          React.createElement(Text, { style: styles.amountUnit }, "¥ "),
          React.createElement(Text, { style: styles.amountValue }, amount.toLocaleString()),
          React.createElement(Text, { style: styles.amountUnit }, " 也")
        )
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "但し書き"),
        React.createElement(
          Text,
          { style: styles.value },
          `${OFUSE_TYPE_LABELS[type] ?? type} として`
        )
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "支払日"),
        React.createElement(Text, { style: styles.value }, dateStr)
      ),
      React.createElement(
        View,
        { style: styles.row },
        React.createElement(Text, { style: styles.label }, "支払方法"),
        React.createElement(
          Text,
          { style: styles.value },
          PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod
        )
      ),
      React.createElement(View, { style: styles.divider }),
      React.createElement(
        View,
        { style: styles.stamp },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: { fontSize: 12, color: "#44403c" } }, templeName),
          React.createElement(
            Text,
            { style: { fontSize: 9, color: "#78716c", marginTop: 4 } },
            "以上、確かに受領いたしました。"
          )
        ),
        React.createElement(
          View,
          { style: styles.stampBox },
          React.createElement(Text, { style: styles.stampLabel }, "印")
        )
      ),
      React.createElement(
        Text,
        { style: styles.footer },
        `発行日: ${new Date().toLocaleDateString("ja-JP")}  /  てらログ`
      )
    )
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id } = await params;

    const ofuse = await prisma.ofuse.findFirst({
      where: { id, templeId: authUser.templeId },
      include: {
        member: { include: { user: { select: { name: true } } } },
        temple: { select: { name: true } },
      },
    });

    if (!ofuse) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const docElement = ReceiptDocument({
      templeName: ofuse.temple.name,
      memberName: ofuse.member.user.name,
      amount: ofuse.amount,
      type: ofuse.type,
      paymentMethod: ofuse.paymentMethod,
      paidAt: ofuse.paidAt,
      receiptNo: ofuse.id.slice(0, 8).toUpperCase(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(docElement as any);

    // 領収書発行済みフラグを更新
    await prisma.ofuse.update({ where: { id }, data: { receiptIssued: true } });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt_${ofuse.id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[/api/ofuse/[id]/receipt]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
