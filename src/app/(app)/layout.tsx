import { getAuthUser } from "@/lib/auth";
import BottomNav from "@/components/shared/BottomNav";

// 利用者側（檀家・ご縁さん）レイアウト
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();
  const isDanka = authUser?.member?.type === "DANKA";

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {children}
      <BottomNav isDanka={isDanka} />
    </div>
  );
}
