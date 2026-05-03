"use client";

import { useRouter } from "next/navigation";

type TempleRow = {
  id: string;
  name: string;
  denomination: string | null;
  address: string | null;
  createdAt: Date;
  _count: { members: number; events: number };
  users: { name: string; email: string; lastLoginAt: Date | null }[];
};

export default function TemplesTable({ temples }: { temples: TempleRow[] }) {
  const router = useRouter();

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-800/50">
              <th className="text-left px-4 py-3 text-stone-400 font-medium">寺院名</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">宗派</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">管理者</th>
              <th className="text-right px-4 py-3 text-stone-400 font-medium">フォロワー数</th>
              <th className="text-right px-4 py-3 text-stone-400 font-medium">イベント数</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">最終ログイン</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">登録日</th>
            </tr>
          </thead>
          <tbody>
            {temples.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-stone-500">
                  登録されているお寺がありません
                </td>
              </tr>
            ) : (
              temples.map((temple) => {
                const admin = temple.users[0];
                return (
                  <tr
                    key={temple.id}
                    className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/superadmin/temples/${temple.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{temple.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{temple.address}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {temple.denomination ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {admin ? (
                        <>
                          <p className="text-stone-200 text-xs">{admin.name}</p>
                          <p className="text-stone-500 text-xs">{admin.email}</p>
                        </>
                      ) : (
                        <span className="text-stone-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {temple._count.members}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-300">
                      {temple._count.events}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {admin?.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString("ja-JP")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(temple.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
