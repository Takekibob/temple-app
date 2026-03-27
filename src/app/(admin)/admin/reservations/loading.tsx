import { Skeleton } from "@/components/ui/skeleton";

export default function AdminReservationsLoading() {
  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-stone-100">
          {["w-20", "w-24", "w-28", "w-20", "w-16"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-stone-50 items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
