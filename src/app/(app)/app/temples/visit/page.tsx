import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, ChevronRight, MapPin, Stamp } from "lucide-react";
import SearchBar from "@/components/app/SearchBar";

export default async function TempleVisitPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const { search } = await searchParams;

  const temples = await prisma.temple.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { denomination: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link
          href="/app/temples/history"
          className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">参拝を記録する</h1>
          <p className="text-xs text-stone-400 mt-0.5">お寺を選んでください</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* 検索 */}
        <Suspense>
          <SearchBar placeholder="お寺名・宗派・地名で検索..." paramName="search" />
        </Suspense>

        {/* お寺リスト */}
        {temples.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center">
            <Stamp size={24} className="text-stone-300 mx-auto mb-2" />
            <p className="text-stone-400 text-sm">「{search}」に一致するお寺が見つかりませんでした</p>
          </div>
        ) : (
          <div className="space-y-2">
            {temples.map((t) => (
              <Link
                key={t.id}
                href={`/app/temples/${t.id}/visit`}
                className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl p-4 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg shrink-0">
                  🏯
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 text-sm">{t.name}</p>
                  {t.denomination && (
                    <p className="text-xs text-amber-700 font-medium mt-0.5">{t.denomination}</p>
                  )}
                  {t.address && (
                    <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={10} />
                      {t.address}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-1 rounded-lg border border-teal-100">
                    記録する
                  </span>
                  <ChevronRight size={14} className="text-stone-300" />
                </div>
              </Link>
            ))}
            {temples.length === 30 && (
              <p className="text-xs text-stone-400 text-center pt-2">
                検索キーワードを入力してさらに絞り込んでください
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
