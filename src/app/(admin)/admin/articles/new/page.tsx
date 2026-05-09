import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import ArticleFormClient from "../ArticleFormClient";

export default async function AdminArticleNewPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  return <ArticleFormClient />;
}
