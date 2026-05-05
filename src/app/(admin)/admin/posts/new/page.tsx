import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import PostFormClient from "../PostFormClient";

export default async function AdminPostNewPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  return <PostFormClient />;
}
