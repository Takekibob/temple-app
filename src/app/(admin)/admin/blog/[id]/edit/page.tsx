import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BlogFormClient from "../../BlogFormClient";

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { id, templeId: authUser.templeId },
  });
  if (!post) notFound();

  return (
    <BlogFormClient
      initial={{
        id: post.id,
        title: post.title,
        body: post.body,
        coverImageUrl: post.coverImageUrl,
        isSubscriberOnly: post.isSubscriberOnly,
        status: post.status,
      }}
    />
  );
}
