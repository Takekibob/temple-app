import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DonationThanksPage({
  params,
}: {
  params: Promise<{ templeId: string }>;
}) {
  const { templeId } = await params;

  const temple = await prisma.temple.findUnique({
    where: { id: templeId },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="text-5xl mb-4">🙏</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">ご寄付ありがとうございます</h1>
        <p className="text-stone-500 mb-2">
          {temple?.name ?? "お寺"}へのご寄付を受け付けました。
        </p>
        <p className="text-sm text-stone-400 mb-8">
          確認メールをお送りしています。ご寄付は大切に活用させていただきます。
        </p>
        <Link
          href={`/donate/${templeId}`}
          className="text-amber-700 text-sm hover:text-amber-900"
        >
          寄付ページに戻る
        </Link>
      </div>
    </div>
  );
}
