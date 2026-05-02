import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Plus, Users, ChevronRight, Settings2 } from "lucide-react";

const PRICING_LABELS: Record<string, string> = {
  FREE: "無料",
  ONE_TIME: "一括払い",
  SUBSCRIPTION: "サブスクリプション",
  DONATION: "寄付",
};

const PRICING_COLORS: Record<string, string> = {
  FREE: "bg-stone-100 text-stone-600",
  ONE_TIME: "bg-sky-100 text-sky-700",
  SUBSCRIPTION: "bg-amber-100 text-amber-700",
  DONATION: "bg-purple-100 text-purple-700",
};

export default async function MembershipsPage() {
  const authUser = await requireAdminOrStaff();

  const membershipTypes = await prisma.membershipType.findMany({
    where: { templeId: authUser.templeId },
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (membershipTypes.length === 0) {
    redirect("/admin/memberships/setup");
  }

  const totalActive = membershipTypes.reduce(
    (sum, t) => sum + t._count.memberships,
    0
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">メンバーシップ設計</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {membershipTypes.length} 種類 · アクティブ会員 {totalActive.toLocaleString()} 名
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/memberships/setup"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Settings2 size={14} />
            テンプレート再適用
          </Link>
          <Link
            href="/admin/memberships/new"
            className="flex items-center gap-1.5 text-sm font-semibold bg-amber-700 text-white px-3 py-2 rounded-xl hover:bg-amber-800 transition-colors shadow-sm"
          >
            <Plus size={14} />
            種別を追加
          </Link>
        </div>
      </div>

      {/* メンバーシップ種別一覧 */}
      <div className="space-y-3">
        {membershipTypes.map((mt) => (
          <div
            key={mt.id}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-base font-bold text-stone-800">{mt.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRICING_COLORS[mt.pricingModel] ?? "bg-stone-100 text-stone-600"}`}>
                    {PRICING_LABELS[mt.pricingModel] ?? mt.pricingModel}
                  </span>
                  {!mt.isPublic && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">非公開</span>
                  )}
                </div>
                {mt.description && (
                  <p className="text-sm text-stone-500 mb-3">{mt.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-stone-600">
                    <Users size={14} className="text-stone-400" />
                    <span className="font-semibold text-stone-800">{mt._count.memberships}</span>
                    <span className="text-stone-400">名</span>
                  </div>
                  {mt.priceJpy != null && (
                    <div className="text-stone-500">
                      ¥{mt.priceJpy.toLocaleString()}
                      {mt.billingCycle === "MONTHLY" ? "/月" : mt.billingCycle === "YEARLY" ? "/年" : ""}
                    </div>
                  )}
                </div>

                {/* ステージ */}
                {mt.stages.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {mt.stages.map((stage, i) => (
                      <div key={stage.id} className="flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 bg-stone-50 border border-stone-200 rounded-full text-stone-600">
                          {stage.name}
                        </span>
                        {i < mt.stages.length - 1 && (
                          <ChevronRight size={10} className="text-stone-300" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作 */}
              <Link
                href={`/admin/memberships/${mt.id}/edit`}
                className="shrink-0 text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
              >
                編集
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* 説明 */}
      <div className="mt-6 bg-stone-50 rounded-xl p-4 text-xs text-stone-500 space-y-1">
        <p className="font-semibold text-stone-600">メンバーシップ設計とは？</p>
        <p>お寺ごとに「檀家」「ご縁さん」「月額サポーター」など、自由に会員の種類を定義できます。</p>
        <p>会員一覧から各会員にメンバーシップを付与・変更できます。</p>
      </div>
    </div>
  );
}
