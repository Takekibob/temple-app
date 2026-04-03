import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChangeRequestsClient from "./ChangeRequestsClient";
import { FilePen } from "lucide-react";

export default async function ChangeRequestsPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const requests = await prisma.memberChangeRequest.findMany({
    where: { templeId: authUser.templeId! },
    include: {
      member: { select: { id: true, familyName: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <FilePen size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">情報変更申請</h1>
        </div>
        <p className="text-sm text-stone-400">
          檀家から申請された情報変更を確認・承認・却下できます
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              未対応 {pendingCount}件
            </span>
          )}
        </p>
      </div>

      <ChangeRequestsClient
        requests={requests.map((r) => ({
          id: r.id,
          status: r.status,
          requestData: r.requestData as Record<string, string>,
          createdAt: r.createdAt.toLocaleDateString("ja-JP"),
          reviewedAt: r.reviewedAt?.toLocaleDateString("ja-JP") ?? null,
          rejectedReason: r.rejectedReason ?? null,
          member: r.member,
          reviewerName: r.reviewer?.name ?? null,
        }))}
      />
    </div>
  );
}
