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
    include: { member: true, temple: { select: { id: true, name: true } } },
  });

  if (!user) redirect("/");

  const interestTags = Array.isArray(user.member?.interestTags)
    ? (user.member.interestTags as string[])
    : [];

  // GOEN: サブスクリプション状態確認
  const activeSubscription =
    user.member?.type === "GOEN" && user.member.id && user.templeId
      ? await prisma.memberSubscription.findFirst({
          where: { memberId: user.member.id, templeId: user.templeId, status: "ACTIVE" },
          include: { plan: { select: { name: true } } },
        })
      : null;

  return (
    <MypageClient
      user={{ name: user.name, email: user.email, role: user.role }}
      member={
        user.member
          ? { id: user.member.id, type: user.member.type, familyName: user.member.familyName }
          : null
      }
      templeId={user.templeId ?? ""}
      subscriptionPlanName={activeSubscription?.plan.name ?? null}
      lineLinked={!!user.member?.lineUserId}
    />
  );
}
