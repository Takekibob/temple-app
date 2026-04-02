import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export default async function DankaInfoPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
    include: {
      member: {
        select: {
          type: true,
          familyName: true,
          address: true,
          postalCode: true,
          phone: true,
          email: true,
          joinedDate: true,
          referralSource: true,
        },
      },
    },
  });
  if (!user || user.member?.type !== "DANKA") redirect("/app/mypage");

  const m = user.member!;

  const rows: { label: string; value: string | null }[] = [
    { label: "檀家名（家名）", value: m.familyName },
    { label: "入檀日", value: m.joinedDate ? new Date(m.joinedDate).toLocaleDateString("ja-JP") : null },
    { label: "郵便番号", value: m.postalCode },
    { label: "住所", value: m.address },
    { label: "電話番号", value: m.phone },
    { label: "メールアドレス", value: m.email },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3">
        <Link href="/app/mypage" className="text-stone-400 hover:text-stone-600 text-lg">‹</Link>
        <h1 className="text-base font-bold text-stone-800">檀家情報</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {rows.map(({ label, value }, i) => (
            <div
              key={label}
              className={`px-4 py-3.5 flex items-start gap-4 ${i > 0 ? "border-t border-stone-50" : ""}`}
            >
              <p className="text-xs text-stone-400 w-28 shrink-0 pt-0.5">{label}</p>
              <p className="text-sm text-stone-700 break-all">{value || "—"}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-stone-400 text-center">
          情報の変更はお寺にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
