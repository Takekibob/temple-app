import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OfuseFormClient from "../../new/OfuseFormClient";

export default async function EditOfusePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const ofuse = await prisma.ofuse.findUnique({
    where: { id },
    include: { member: { include: { user: { select: { name: true } } } } },
  });

  if (!ofuse || ofuse.templeId !== authUser.templeId) notFound();

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/ofuse"
          className="text-sm text-stone-400 hover:text-stone-600 mb-2 inline-block"
        >
          ← お布施管理
        </Link>
        <h1 className="text-2xl font-bold text-stone-800">お布施記録の編集</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {ofuse.member.user.name} さんの記録
        </p>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
        <OfuseFormClient
          members={[]}
          initial={{
            id: ofuse.id,
            memberId: ofuse.memberId ?? "",
            type: ofuse.type,
            amount: ofuse.amount,
            paidAt: ofuse.paidAt.toISOString(),
            paymentMethod: ofuse.paymentMethod,
            receiptIssued: ofuse.receiptIssued,
            notes: ofuse.notes,
          }}
        />
      </div>
    </div>
  );
}
