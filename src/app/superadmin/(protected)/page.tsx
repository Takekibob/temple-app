import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SuperAdminDashboardPage() {
  const [templeCount, memberCount] = await Promise.all([
    prisma.temple.count(),
    prisma.member.count(),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        <p className="text-sm text-stone-400 mt-0.5">プラットフォーム全体の概況</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
          <p className="text-xs text-stone-400">登録寺院数</p>
          <p className="text-3xl font-bold text-white mt-1">{templeCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
          <p className="text-xs text-stone-400">総フォロワー数</p>
          <p className="text-3xl font-bold text-white mt-1">{memberCount}</p>
        </div>
      </div>

      <Link
        href="/superadmin/temples"
        className="block text-center text-xs text-amber-400 hover:text-amber-300"
      >
        お寺一覧を見る →
      </Link>
    </div>
  );
}
