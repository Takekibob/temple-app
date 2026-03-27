import { Skeleton } from "@/components/ui/skeleton";

export default function AppHomeLoading() {
  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* 挨拶 */}
      <Skeleton className="h-5 w-40 mt-2" />

      {/* 次回予約カード */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* おすすめイベント */}
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <Skeleton className="h-24 w-full rounded-none" />
            <div className="p-3 space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* お知らせ */}
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 p-3 flex gap-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
