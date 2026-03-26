import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DeceasedFormClient from "../../DeceasedFormClient";

export default async function EditDeceasedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const [deceased, members] = await Promise.all([
    prisma.deceasedPerson.findFirst({
      where: { id, member: { templeId: authUser.templeId } },
    }),
    prisma.member.findMany({
      where: { templeId: authUser.templeId, type: "DANKA" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!deceased) notFound();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">過去帳 編集</h1>
        <p className="text-sm text-stone-500 mt-0.5">{deceased.name}</p>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
        <DeceasedFormClient
          members={members}
          initial={{
            id: deceased.id,
            memberId: deceased.memberId,
            name: deceased.name,
            kaimyo: deceased.kaimyo,
            deathDate: deceased.deathDate?.toISOString() ?? null,
            age: deceased.age,
            relationship: deceased.relationship,
            notes: deceased.notes,
          }}
        />
      </div>
    </div>
  );
}
