import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OfuseFormClient from "./OfuseFormClient";

export default async function NewOfusePage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const members = await prisma.member.findMany({
    where: { templeId: authUser.templeId },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">お布施 新規記録</h1>
        <p className="text-sm text-stone-500 mt-0.5">収入・寄付を記録します</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
        <OfuseFormClient members={members} />
      </div>
    </div>
  );
}
