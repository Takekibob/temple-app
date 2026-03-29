import { redirect } from "next/navigation";
import SuperAdminInitClient from "./SuperAdminInitClient";

export default async function SuperAdminInitPage() {
  // すでに SUPER_ADMIN が存在する場合はリダイレクト
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/superadmin/init`, {
    cache: "no-store",
  });
  const { needsInit, configured } = await res.json();

  if (!needsInit) {
    redirect("/superadmin");
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <SuperAdminInitClient configured={configured} />
    </div>
  );
}
