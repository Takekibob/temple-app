import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Plus, Users, ChevronRight, Layers } from "lucide-react";

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

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { membershipEnabled: true },
  });

  // 関わり方機能がOFFの場合はリダイレクト
  if (!temple?.membershipEnabled) {
    redirect("/admin/settings");
  }

  const membershipTypes = await prisma.membershipType.findMany({
    where: { templeId: authUser.templeId },
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const totalActive = membershipTypes.reduce(
    (sum, t) => sum + t._count.memberships,
    0
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">関わり方の設計</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {membershipTypes.length} 種類 · 設定済みメンバー {totalActive.toLocaleString()} 名
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/memberships/templates"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Layers size={14} />
            テンプレートから作る
          </Link>
          <Link
            href="/admin/memberships/new"
            className="flex items-center gap-1.5 text-sm font-semibold bg-amber-700 text-white px-3 py-2 rounded-xl hover:bg-amber-800 transition-colors shadow-sm"
          >
            <Plus size={14} />
            関わり方を追加
          </Link>
        </div>
      </div>

      {/* 種別一覧 */}
      {membershipTypes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers size={22} className="text-amber-600" />
          </div>
          <p className="text-stone-700 font-semibold mb-1">関わり方がまだ設定されていません</p>
          <p className="text-sm text-stone-400 mb-5">「関わり方を追加」またはテンプレートから始めましょう</p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/admin/memberships/templates"
              className="px-4 py-2 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50"
            >
              テンプレートから作る
            </Link>
            <Link
              href="/admin/memberships/new"
              className="px-4 py-2 text-sm bg-amber-700 text-white rounded-xl hover:bg-amber-800 font-medium"
            >
              ゼロから追加
            </Link>
          </div>
        </div>
      ) : (
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
      )}

      {/* 説明 */}
      <div className="mt-6 bg-stone-50 rounded-xl p-4 text-xs text-stone-500 space-y-1">
        <p className="font-semibold text-stone-600">関わり方とは？</p>
        <p>お寺ごとに「月額サポーター」「写経会員」「巡礼会員」など、自由にご縁のかたちを定義できます。</p>
        <p>メンバー詳細画面から、各メンバーに関わり方を設定できます。</p>
      </div>
    </div>
  );
}
