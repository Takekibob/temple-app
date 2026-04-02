import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BlocksClient from "./BlocksClient";

export default async function ReservationBlocksPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const blocks = await prisma.reservationBlock.findMany({
    where: { templeId: authUser.templeId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/admin/reservations" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← 法要予約管理
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-800">予約不可日設定</h1>
          <p className="text-sm text-stone-500 mt-0.5">特定の日や時間帯の予約を受け付けないように設定できます</p>
        </div>
      </div>
      <BlocksClient
        initialBlocks={blocks.map((b) => ({
          id: b.id,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          reason: b.reason,
          createdAt: b.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
