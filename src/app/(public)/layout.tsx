import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-stone-800 font-bold">
            <span className="text-xl">🏯</span>
            <span>てらログ</span>
          </Link>
          <Link href="/" className="text-sm text-amber-700 hover:text-amber-800">
            ログインはこちら
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        {children}
      </main>
      <footer className="border-t border-stone-200 mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 flex flex-wrap gap-4 text-xs text-stone-400">
          <Link href="/privacy" className="hover:text-stone-600">プライバシーポリシー</Link>
          <Link href="/terms" className="hover:text-stone-600">利用規約</Link>
          <Link href="/tokushoho" className="hover:text-stone-600">特定商取引法に基づく表記</Link>
        </div>
      </footer>
    </div>
  );
}
