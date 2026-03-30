import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import MfaEnrollClient from "./MfaEnrollClient";

export default async function MfaEnrollPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "SUPER_ADMIN") {
    redirect("/superadmin/login");
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <MfaEnrollClient />
    </div>
  );
}
