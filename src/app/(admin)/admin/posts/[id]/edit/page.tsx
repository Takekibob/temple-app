import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostFormClient from "../../PostFormClient";

export default async function AdminPostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;
  const post = await prisma.templePost.findFirst({
    where: { id, templeId: authUser.templeId },
    include: { photos: { orderBy: { order: "asc" } } },
  });

  if (!post) notFound();

  return (
    <PostFormClient
      isEdit
      initialData={{
        id: post.id,
        title: post.title,
        body: post.body,
        photos: post.photos.map((p) => ({ url: p.url, caption: p.caption })),
      }}
    />
  );
}
