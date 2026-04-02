import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import LineSettingsClient from "./LineSettingsClient";

export default async function LineSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: {
      member: {
        select: {
          id: true,
          lineUserId: true,
          lineNotifyEnabled: true,
          notifyReservation: true,
          notifyEvent: true,
          notifyAnniversary: true,
          notifyAnnouncement: true,
          lineCode: true,
          lineCodeExpiresAt: true,
        },
      },
    },
  });
  if (!user) redirect("/");

  if (!user.member) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3">
          <Link href="/app/mypage" className="text-stone-400 hover:text-stone-600 text-lg">‹</Link>
          <h1 className="text-base font-bold text-stone-800">LINE設定</h1>
        </header>
        <div className="max-w-lg mx-auto px-4 py-6">
          <p className="text-sm text-stone-500">会員登録後にご利用いただけます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3">
        <Link href="/app/mypage" className="text-stone-400 hover:text-stone-600 text-lg">‹</Link>
        <h1 className="text-base font-bold text-stone-800">LINE設定</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <LineSettingsClient
          memberId={user.member.id}
          lineLinked={!!user.member.lineUserId}
          lineNotifyEnabled={user.member.lineNotifyEnabled}
          notifyReservation={user.member.notifyReservation}
          notifyEvent={user.member.notifyEvent}
          notifyAnniversary={user.member.notifyAnniversary}
          notifyAnnouncement={user.member.notifyAnnouncement}
          existingCode={user.member.lineCode ?? null}
          codeExpiresAt={user.member.lineCodeExpiresAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
