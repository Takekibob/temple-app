import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();

  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { name: true },
  });

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(authUser.role);

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar
        templeName={temple?.name ?? "てらログ"}
        userName={authUser.name}
        isAdmin={isAdmin}
      />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
