import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import SuperAdminLoginClient from "./SuperAdminLoginClient";

export default async function SuperAdminLoginPage() {
  const authUser = await getAuthUser();
  if (authUser?.role === "SUPER_ADMIN") {
    redirect("/superadmin");
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <SuperAdminLoginClient />
    </div>
  );
}
