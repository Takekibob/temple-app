import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DeceasedFormClient from "../DeceasedFormClient";

export default async function NewDeceasedPage({
  searchParams,
}: {
  searchParams: Promise<{ memberId?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { memberId } = await searchParams;

  const [members, fromMember] = await Promise.all([
    prisma.member.findMany({
      where: { templeId: authUser.templeId, type: "DANKA" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    memberId
      ? prisma.member.findFirst({
          where: { id: memberId, templeId: authUser.templeId },
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        {fromMember && (
          <a
            href={`/admin/members/${fromMember.id}/family-tree`}
            className="text-sm text-stone-400 hover:text-stone-600 mb-2 inline-block"
          >
            ← {fromMember.user.name} の家系図
          </a>
        )}
        <h1 className="text-2xl font-bold text-stone-800">過去帳 新規登録</h1>
        <p className="text-sm text-stone-500 mt-0.5">故人の情報を記録します</p>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
        <DeceasedFormClient members={members} initialMemberId={memberId} />
      </div>
    </div>
  );
}
