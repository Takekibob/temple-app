import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChangeRequestsClient from "./ChangeRequestsClient";

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

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">檀家情報 変更申請</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          檀家から申請された情報変更を確認・承認・却下できます
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
