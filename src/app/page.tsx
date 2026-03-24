import Link from "next/link";

export default function RootPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-8">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-stone-800 mb-2">てらログ</h1>
        <p className="text-stone-500 mb-8">お寺DX管理アプリ</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/app"
            className="block px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors"
          >
            利用者アプリへ
          </Link>
          <Link
            href="/admin"
            className="block px-6 py-3 border border-stone-400 text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            管理画面へ
          </Link>
          <Link
            href="/login"
            className="block px-6 py-3 text-stone-500 hover:text-stone-700 transition-colors text-sm"
          >
            ログイン
          </Link>
        </div>
      </div>
    </main>
  );
}
