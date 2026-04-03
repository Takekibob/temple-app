import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GojikaiClient from "./GojikaiClient";
import { Landmark } from "lucide-react";

interface SearchParams {
  year?: string;
}

export default async function AdminGojikaiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { year } = await searchParams;
  const now = new Date();
  const currentFiscalYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fiscalYear = parseInt(year ?? String(currentFiscalYear));

  const [payments, rule] = await Promise.all([
    prisma.gojikaiPayment.findMany({
      where: { fiscalYear, member: { templeId: authUser.templeId } },
      orderBy: { createdAt: "asc" },
      include: { member: { include: { user: { select: { name: true } } } } },
    }),
    prisma.gojikaiRule.findFirst({ where: { templeId: authUser.templeId } }),
  ]);

  const years = Array.from({ length: 5 }, (_, i) => currentFiscalYear - i);

  const serializedPayments = payments.map((p) => ({
    ...p,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Landmark size={18} className="text-amber-700" />
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">護持会費管理</h1>
          </div>
          <p className="text-sm text-stone-400">
            {fiscalYear}年度（{fiscalYear}/4〜{fiscalYear + 1}/3）
          </p>
        </div>
      </div>

      {/* 年度切替 */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-stone-400 font-medium">年度:</span>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/gojikai?year=${y}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                fiscalYear === y
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {y}年度
            </Link>
          ))}
        </div>
      </div>

      <GojikaiClient
        key={fiscalYear}
        payments={serializedPayments}
        fiscalYear={fiscalYear}
        ruleAmount={rule?.amount ?? null}
      />
    </div>
  );
}
