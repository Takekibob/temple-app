import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export default async function ReservationsLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");
  if (!authUser.member || authUser.member.type !== "DANKA") {
    redirect("/app");
  }
  return <>{children}</>;
}
