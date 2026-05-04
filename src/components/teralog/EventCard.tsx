import Link from "next/link";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function formatDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = DAYS[date.getDay()];
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${m}.${d} ${day} · ${h}:${min}`;
}

function formatPrice(priceMode: EventCardData["priceMode"], priceJpy: number | null): string {
  if (priceMode === "FREE") return "無料";
  if (priceMode === "VOLUNTARY") return "お気持ち";
  if (priceJpy == null) return "金額未設定";
  return `¥ ${priceJpy.toLocaleString("ja-JP")}`;
}

export interface EventCardData {
  id: string;
  title: string;
  startsAt: Date;
  endsAt?: Date;
  venue?: string;
  capacity: number | null;
  participantsCount: number;
  priceMode: "FREE" | "VOLUNTARY" | "FIXED";
  priceJpy: number | null;
  isParticipating?: boolean;
  templeId: string;
  templeName?: string;
  isFromFollowedTemple?: boolean;
}

type Props = {
  event: EventCardData;
  onJoinClick: (event: EventCardData) => void;
  variant?: "default" | "compact";
  showTempleName?: boolean;
};

function ParticipateButton({
  event,
  onClick,
}: {
  event: EventCardData;
  onClick: () => void;
}) {
  const now = new Date();
  const isPast = event.endsAt ? event.endsAt < now : event.startsAt < now;
  const isFull =
    event.capacity !== null &&
    event.participantsCount >= event.capacity &&
    !event.isParticipating;

  if (isPast) {
    return (
      <span className="font-sans text-[11px] text-ink-tertiary tracking-section">
        受付終了
      </span>
    );
  }
  if (isFull) {
    return (
      <span className="font-sans text-[11px] text-ink-tertiary tracking-section">
        満 員
      </span>
    );
  }
  if (event.isParticipating) {
    return (
      <Link
        href={`/app/events/${event.id}`}
        className="font-serif text-[12px] text-ink font-light tracking-section"
      >
        参加予定 ✓
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-serif text-[12px] text-ink font-light tracking-button border-b-[0.5px] border-ink pb-0.5"
    >
      参 加 す る
    </button>
  );
}

export default function EventCard({
  event,
  onJoinClick,
  variant = "default",
  showTempleName = false,
}: Props) {
  const remaining =
    event.capacity !== null ? event.capacity - event.participantsCount : null;
  const isCompact = variant === "compact";

  return (
    <article className="bg-paper border-b-[0.5px] border-border py-5">
      {/* 上段: 日付 + 残席 */}
      <div className="flex items-baseline justify-between mb-2">
        <time className="font-sans text-[11px] text-ink-secondary">
          {formatDate(event.startsAt)}
        </time>
        {remaining !== null && remaining <= 5 && remaining > 0 && (
          <span className="font-sans text-[11px] text-ink-tertiary">
            残り {remaining} 名
          </span>
        )}
        {remaining === 0 && !event.isParticipating && (
          <span className="font-sans text-[11px] text-ink-tertiary">満員</span>
        )}
      </div>

      {/* 寺院名 (showTempleName時) */}
      {showTempleName && event.templeName && (
        <p className="font-serif text-[10px] text-ink-tertiary tracking-section font-light mb-1">
          {event.templeName}
        </p>
      )}

      {/* 中段: タイトル */}
      <Link href={`/app/events/${event.id}`}>
        <h3
          className={`font-serif text-ink font-medium leading-snug mb-1 ${
            isCompact ? "text-[15px]" : "text-[17px]"
          }`}
        >
          {event.title}
        </h3>
      </Link>

      {/* 会場 */}
      {event.venue && !isCompact && (
        <p className="font-serif text-[12px] text-ink-secondary font-light mb-3">
          {event.venue}
        </p>
      )}

      {/* 下段: 金額 + 参加ボタン */}
      <div className="flex items-center justify-between pt-3 border-t-[0.5px] border-border-thin mt-3">
        <span className="font-sans text-[12px] text-ink-secondary">
          {formatPrice(event.priceMode, event.priceJpy)}
        </span>
        <ParticipateButton event={event} onClick={() => onJoinClick(event)} />
      </div>
    </article>
  );
}
