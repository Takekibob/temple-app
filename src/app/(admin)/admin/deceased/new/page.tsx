import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DeceasedFormClient from "../DeceasedFormClient";

export default async function NewDeceasedPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const members = await prisma.member.findMany({
    where: { templeId: authUser.templeId, type: "DANKA" },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">過去帳 新規登録</h1>
        <p className="text-sm text-stone-500 mt-0.5">故人の情報を記録します</p>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
        <DeceasedFormClient members={members} />
      </div>
    </div>
  );
}
