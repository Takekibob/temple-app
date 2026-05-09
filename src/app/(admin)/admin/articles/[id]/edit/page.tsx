import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ArticleFormClient from "../../ArticleFormClient";

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const article = await prisma.article.findFirst({
    where: {
      id,
      ...(authUser.role === "SUPER_ADMIN" ? {} : { templeId: authUser.templeId }),
    },
  });

  if (!article) notFound();

  return (
    <ArticleFormClient
      isEdit
      articleId={article.id}
      initialData={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        body: article.body,
        category: article.category,
        coverImage: article.coverImage,
        status: article.status,
      }}
    />
  );
}
