import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import DankaInfoClient from "./DankaInfoClient";

export default async function DankaInfoPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: {
      member: {
        select: {
          id: true,
          type: true,
          familyName: true,
          address: true,
          postalCode: true,
          phone: true,
          email: true,
          joinedDate: true,
          changeRequests: {
            where: { status: "PENDING" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!user || user.member?.type !== "DANKA") redirect("/app/mypage");

  const m = user.member!;
  const pendingRequest = m.changeRequests[0] ?? null;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-2">
        <Link href="/app/mypage" className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"><ChevronLeft size={18} /></Link>
        <h1 className="text-base font-bold text-stone-800">檀家情報</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <DankaInfoClient
          memberId={m.id}
          current={{
            familyName: m.familyName,
            address: m.address ?? "",
            postalCode: m.postalCode ?? "",
            phone: m.phone ?? "",
            email: m.email ?? "",
            joinedDate: m.joinedDate.toLocaleDateString("ja-JP"),
          }}
          pendingRequest={
            pendingRequest
              ? {
                  id: pendingRequest.id,
                  requestData: pendingRequest.requestData as Record<string, string>,
                  createdAt: pendingRequest.createdAt.toLocaleDateString("ja-JP"),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
