import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AcceptInviteClient from "./AcceptInviteClient";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "管理者（住職）",
  STAFF: "スタッフ",
  SUPER_ADMIN: "システム管理者",
};

export default async function AcceptInvitePage() {
  const authUser = await getAuthUser();

  // 未認証 or 一般会員は対象外
  if (!authUser) redirect("/auth/login");
  if (authUser.role === "MEMBER") redirect("/app");

  const temple = await prisma.temple.findUnique({
    where: { id: authUser.templeId },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <AcceptInviteClient
        currentName={authUser.name}
        roleName={ROLE_LABELS[authUser.role] ?? authUser.role}
        templeName={temple?.name ?? ""}
      />
    </div>
  );
}
