import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-6">
      <Skeleton className="h-7 w-36" />

      {[...Array(3)].map((_, g) => (
        <div key={g} className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
          <Skeleton className="h-5 w-32" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ))}

      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
  );
}
