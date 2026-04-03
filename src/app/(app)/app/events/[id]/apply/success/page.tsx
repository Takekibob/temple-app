import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { CheckCircle2, AlertTriangle, Smartphone } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ApplySuccessPage({ params, searchParams }: Props) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id: eventId } = await params;
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect(`/app/events/${eventId}`);
  }

  let sessionStatus: string | null = null;
  let eventTitle: string | null = null;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    sessionStatus = session.payment_status;

    if (session.line_items) {
      const items = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
      eventTitle = items.data[0]?.description ?? null;
    }
  } catch {
    // Stripe API エラーは無視してフォールバック表示
  }

  const isPaid = sessionStatus === "paid";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 max-w-sm w-full text-center">
        {isPaid ? (
          <>
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-teal-600" />
            </div>
            <h1 className="text-xl font-bold text-stone-800 mb-2">
              お申込みが完了しました
            </h1>
            <p className="text-stone-500 text-sm mb-2">
              決済が確認されました。参加が確定しています。
            </p>
            {eventTitle && (
              <p className="text-xs text-stone-400 mb-6">{eventTitle}</p>
            )}

            <div className="bg-stone-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
                <Smartphone size={13} />
                アプリに戻るには
              </p>
              <p className="text-xs text-stone-500">1. このブラウザを閉じる</p>
              <p className="text-xs text-stone-500">2. ホーム画面の「てらログ」をタップ</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/app/events/my"
                className="block w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-xl transition-colors text-center"
              >
                申込済みイベントを確認
              </Link>
              <Link
                href="/app/events"
                className="block w-full py-3 px-4 border border-stone-200 text-stone-600 text-sm rounded-xl hover:bg-stone-50 transition-colors text-center"
              >
                イベント一覧に戻る
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-stone-800 mb-2">
              決済が確認できませんでした
            </h1>
            <p className="text-stone-500 text-sm mb-6">
              決済が完了していないか、処理中の可能性があります。しばらく経ってからご確認ください。
            </p>
            <Link
              href={`/app/events/${eventId}/apply`}
              className="block w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold rounded-xl transition-colors text-center"
            >
              申込ページに戻る
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
