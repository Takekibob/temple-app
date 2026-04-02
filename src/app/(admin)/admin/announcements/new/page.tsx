import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AnnouncementFormClient from "../AnnouncementFormClient";

export default async function NewAnnouncementPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const members = await prisma.member.findMany({
    where: { templeId: authUser.templeId },
    select: { id: true, familyName: true, user: { select: { name: true } } },
    orderBy: { familyName: "asc" },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/announcements"
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          ← お知らせ一覧
        </Link>
        <h1 className="text-2xl font-bold text-stone-800 mt-2">お知らせ作成</h1>
      </div>

      <AnnouncementFormClient
        allMembers={members.map((m) => ({ id: m.id, name: m.user.name, familyName: m.familyName }))}
      />
    </div>
  );
}
