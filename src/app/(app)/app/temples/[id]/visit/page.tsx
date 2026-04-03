import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronLeft } from "lucide-react";
import VisitFormClient from "./VisitFormClient";

export default async function TempleVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const { id } = await params;

  const temple = await prisma.temple.findFirst({
    where: { id, isActive: true },
    select: { id: true, name: true, denomination: true },
  });

  if (!temple) notFound();

  const now = new Date();
  // today midnight in JST as the canonical visitedAt
  const todayISO = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();

  return (
    <div className="max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link
          href={`/app/temples/${id}`}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">参拝を記録する</h1>
          <p className="text-xs text-stone-400 mt-0.5">{temple.name}</p>
        </div>
      </div>

      <VisitFormClient
        templeId={temple.id}
        templeName={temple.name}
        denomination={temple.denomination}
        visitedAt={todayISO}
      />
    </div>
  );
}
