import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  return (
    <div className="pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-6 pb-5 flex items-center gap-2">
        <Link
          href="/app/settings"
          className="flex items-center gap-1 font-serif text-[11px] text-ink-tertiary hover:text-ink transition-colors"
        >
          <ChevronLeft size={13} />
          設定
        </Link>
      </div>
      <div className="px-5">
        <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-4">通知設定</p>
        <NotificationsClient
          pushEnabled={authUser.pushEnabled}
          memberId={authUser.member?.id ?? null}
          notifyEvent={authUser.member?.notifyEvent ?? true}
          notifyAnnouncement={authUser.member?.notifyAnnouncement ?? true}
        />
      </div>
    </div>
  );
}
