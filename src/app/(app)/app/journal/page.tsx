import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import JournalListClient from "./JournalListClient";

export default async function JournalPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  return <JournalListClient />;
}
