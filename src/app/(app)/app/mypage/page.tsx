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

  return (
    <MypageClient
      user={{ name: user.name, email: user.email }}
      member={
        user.member
          ? { id: user.member.id, familyName: user.member.familyName }
          : null
      }
      templeId={user.templeId ?? null}
      lineLinked={!!user.member?.lineUserId}
    />
  );
}
