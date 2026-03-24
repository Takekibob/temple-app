import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import EventFormClient from "../EventFormClient";

export default async function AdminEventNewPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  return <EventFormClient />;
}
