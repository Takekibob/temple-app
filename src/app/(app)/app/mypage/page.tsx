import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import MypageClient from "./MypageClient";

export default async function MypagePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

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
    <MypageClient
      user={{
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        pushEnabled: user.pushEnabled,
        role: user.role,
      }}
      member={
        user.member
          ? {
              id: user.member.id,
              type: user.member.type,
              familyName: user.member.familyName,
              address: user.member.address ?? "",
              interestTags,
              lineLinked: !!user.member.lineUserId,
              lineNotifyEnabled: user.member.lineNotifyEnabled,
              notifyReservation: user.member.notifyReservation,
              notifyEvent: user.member.notifyEvent,
              notifyAnniversary: user.member.notifyAnniversary,
              notifyAnnouncement: user.member.notifyAnnouncement,
            }
          : null
      }
    />
  );
}
