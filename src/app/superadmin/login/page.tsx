import { redirect } from "next/navigation";

// ログイン窓口は / に統一
export default function SuperAdminLoginPage() {
  redirect("/");
}
