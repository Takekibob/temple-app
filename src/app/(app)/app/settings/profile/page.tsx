import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import ProfileEditClient from "./ProfileEditClient";

export default async function ProfileEditPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: { member: true },
  });
  if (!user) redirect("/");

  const interestTags = Array.isArray(user.member?.interestTags)
    ? (user.member.interestTags as string[])
    : [];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-2">
        <Link href="/app/settings" className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"><ChevronLeft size={18} /></Link>
        <h1 className="text-base font-bold text-stone-800">プロフィール編集</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <ProfileEditClient
          user={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
          member={user.member ? {
            postalCode: user.member.postalCode ?? "",
            address: user.member.address ?? "",
            interestTags,
          } : null}
          avatarUrl={user.avatarUrl ?? null}
        />
      </div>
    </div>
  );
}
