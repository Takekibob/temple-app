import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import MypageClient from "./MypageClient";

export default async function SettingsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  return (
    <MypageClient
      user={{ name: authUser.name, email: authUser.email, avatarUrl: authUser.avatarUrl ?? null }}
      member={{ id: authUser.member.id, familyName: authUser.member.familyName }}
      templeId={authUser.templeId ?? null}
      lineLinked={!!authUser.member.lineUserId}
    />
  );
}
