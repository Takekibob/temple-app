import { redirect } from "next/navigation";

export default function RevenuePlansRedirect() {
  redirect("/admin/plans");
}
