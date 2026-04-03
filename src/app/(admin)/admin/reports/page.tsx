import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import ReportsClient from "./ReportsClient";

export default async function AdminReportsPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">お布施会計</h1>
        <p className="text-sm text-stone-500 mt-0.5">お布施収入の集計・推移（月次/年次）</p>
      </div>
      <ReportsClient />
    </div>
  );
}
