import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import ImportClient from "./ImportClient";

export default async function MemberImportPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");
  if (authUser.role === "STAFF") redirect("/admin/members");

  return <ImportClient />;
}
