import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GojikaiClient from "./GojikaiClient";

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
  // 日本の年度は4月始まり: 1〜3月は前年度
  const now = new Date();
  const currentFiscalYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fiscalYear = parseInt(year ?? String(currentFiscalYear));

  const [payments, rule] = await Promise.all([
    prisma.gojikaiPayment.findMany({
      where: {
        fiscalYear,
        member: { templeId: authUser.templeId },
      },
      orderBy: { createdAt: "asc" },
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.gojikaiRule.findFirst({ where: { templeId: authUser.templeId } }),
  ]);

  const years = Array.from({ length: 5 }, (_, i) => currentFiscalYear - i);

  // Serialize Date objects for client component
  const serializedPayments = payments.map((p) => ({
    ...p,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">護持会費管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">{fiscalYear}年度（{fiscalYear}/4〜{fiscalYear + 1}/3）</p>
        </div>
      </div>

      {/* 年度切替 */}
      <div className="flex gap-2 mb-6 items-center">
        <span className="text-sm text-stone-500">年度:</span>
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/gojikai?year=${y}`}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                fiscalYear === y
                  ? "bg-amber-700 text-white font-medium"
                  : "text-stone-600 hover:bg-stone-100"
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
