/**
 * POST /api/membership-types/setup
 * テンプレートキーを受け取り、MembershipType + MembershipStage を一括生成する
 */
import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTemplate } from "@/lib/membershipTemplates";

export async function POST(request: Request) {
  try {
    const authUser = await requireAdminOrStaff();
    const { templateKey } = await request.json();

    if (!templateKey) {
      return NextResponse.json({ error: "templateKey は必須です" }, { status: 400 });
    }

    const template = getTemplate(templateKey);
    if (!template) {
      return NextResponse.json({ error: "不明なテンプレートキーです" }, { status: 400 });
    }

    // カスタムテンプレートは何も生成しない
    if (template.membershipTypes.length === 0) {
      return NextResponse.json({ membershipTypes: [], message: "カスタムテンプレートが選択されました。メンバーシップ設計画面から追加してください。" });
    }

    // 既存のMembershipTypeがあれば重複作成しない
    const existingCount = await prisma.membershipType.count({
      where: { templeId: authUser.templeId },
    });

    const created = await prisma.$transaction(
      template.membershipTypes.map((spec, index) =>
        prisma.membershipType.create({
          data: {
            templeId: authUser.templeId,
            name: spec.name,
            description: spec.description ?? null,
            pricingModel: spec.pricingModel,
            priceJpy: spec.priceJpy ?? null,
            billingCycle: spec.billingCycle ?? null,
            isPublic: spec.isPublic,
            sortOrder: existingCount + index,
            stages: {
              create: spec.stages.map((s) => ({
                name: s.name,
                order: s.order,
              })),
            },
          },
          include: { stages: { orderBy: { order: "asc" } } },
        })
      )
    );

    return NextResponse.json({ membershipTypes: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/membership-types/setup]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
