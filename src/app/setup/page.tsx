import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SetupClient from "./SetupClient";

export default async function SetupPage() {
  // 既にセットアップ済みの場合は無効化
  const [templeCount, adminCount] = await Promise.all([
    prisma.temple.count(),
    prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } }),
  ]);

  if (templeCount > 0 && adminCount > 0) {
    redirect("/auth/login?message=setup-complete");
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <SetupClient />
    </div>
  );
}
