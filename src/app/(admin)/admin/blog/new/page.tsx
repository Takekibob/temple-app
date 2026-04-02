import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import BlogFormClient from "../BlogFormClient";

export default async function AdminBlogNewPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");
  return <BlogFormClient />;
}
