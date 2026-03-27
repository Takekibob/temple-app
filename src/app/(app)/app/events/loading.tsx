import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <div className="max-w-lg mx-auto p-4">
      <Skeleton className="h-6 w-32 mb-4" />

      {/* カテゴリフィルター */}
      <div className="flex gap-2 mb-4 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full shrink-0" />
        ))}
      </div>

      {/* イベントカード */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-stone-200 overflow-hidden flex">
            <Skeleton className="w-24 h-24 rounded-none shrink-0" />
            <div className="p-3 flex-1 space-y-2">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
