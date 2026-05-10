import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileEditClient from "./ProfileEditClient";

export default async function ProfileEditPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const member = await prisma.member.findFirst({
    where: { user: { email: authUser.email } },
    select: { postalCode: true, address: true, interestTags: true },
  });

  const interestTags = Array.isArray(member?.interestTags)
    ? (member!.interestTags as string[])
    : [];

  return (
    <div className="pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-6 pb-5 flex items-center gap-2">
        <Link
          href="/app/settings"
          className="flex items-center gap-1 font-serif text-[11px] text-ink-tertiary hover:text-ink transition-colors"
        >
          <ChevronLeft size={13} />
          設定
        </Link>
      </div>
      <div className="px-5">
        <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-4">プロフィール編集</p>
        <ProfileEditClient
          user={{ name: authUser.name, email: authUser.email, phone: authUser.phone ?? "" }}
          member={member ? {
            postalCode: member.postalCode ?? "",
            address: member.address ?? "",
            interestTags,
          } : null}
          avatarUrl={authUser.avatarUrl ?? null}
        />
      </div>
    </div>
  );
}
