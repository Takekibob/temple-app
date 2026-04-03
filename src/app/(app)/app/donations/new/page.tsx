import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DonationFormClient from "./DonationFormClient";

export default async function NewDonationPage({
  searchParams,
}: {
  searchParams: Promise<{ templeId?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const isAdminOrStaff = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
  if (isAdminOrStaff) redirect("/app/donations");

  const { templeId: queryTempleId } = await searchParams;
  const templeId = queryTempleId ?? authUser.templeId;

  if (!templeId) redirect("/app/donations");

  // アクセス権確認：所属寺院またはフォロー中
  const memberId = authUser.member?.id;
  if (memberId && templeId !== authUser.templeId) {
    const fav = await prisma.memberFavoriteTemple.findFirst({
      where: { memberId, templeId },
    });
    if (!fav) redirect("/app/donations");
  }

  const temple = await prisma.temple.findUnique({
    where: { id: templeId },
    select: { id: true, name: true, stripeConnectOnboarded: true },
  });

  if (!temple) redirect("/app/donations");
  if (!temple.stripeConnectOnboarded) redirect("/app/donations");

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-2">
        <Link href="/app/donations" className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <h1 className="text-base font-bold text-stone-800">寄付する</h1>
      </header>
      <DonationFormClient temple={temple} userEmail={authUser.email} />
    </div>
  );
}
