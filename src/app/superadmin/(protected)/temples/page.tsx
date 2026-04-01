import { prisma } from "@/lib/prisma";
import Link from "next/link";
import TemplesTable from "./TemplesTable";

export default async function SuperAdminTemplesPage() {
  const temples = await prisma.temple.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { members: true, events: true },
      },
      users: {
        where: { role: "ADMIN" },
        select: { name: true, email: true, lastLoginAt: true },
        take: 1,
      },
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">お寺一覧</h1>
          <p className="text-sm text-stone-400 mt-0.5">全 {temples.length} 件</p>
        </div>
        <Link
          href="/superadmin/temples/new"
          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
        >
          ＋ 新規寺院を追加
        </Link>
      </div>

      <TemplesTable temples={temples} />
    </div>
  );
}
