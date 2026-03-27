import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMemberDetailLoading() {
  return (
    <div className="p-6 max-w-2xl">
      {/* パンくず */}
      <Skeleton className="h-4 w-40 mb-4" />

      {/* プロフィール */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* 詳細情報 */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-stone-50">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* 予約履歴 */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-stone-50">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
