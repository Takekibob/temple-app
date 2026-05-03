import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AnnouncementFormClient from "../../AnnouncementFormClient";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;
  const announcement = await prisma.announcement.findFirst({
    where: { id, templeId: authUser.templeId },
  });

  if (!announcement) notFound();

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/announcements"
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          ← お知らせ一覧
        </Link>
        <h1 className="text-2xl font-bold text-stone-800 mt-2">お知らせ編集</h1>
      </div>

      <AnnouncementFormClient
        initial={{
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          publishedAt: announcement.publishedAt?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
