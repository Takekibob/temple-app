import { redirect } from "next/navigation";

// /auth/login は / (ルートページ) に統合されました
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams(params).toString();
  redirect(qs ? `/?${qs}` : "/");
}
