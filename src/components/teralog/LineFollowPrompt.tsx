import Link from "next/link";

interface Props {
  lineUserId?: string | null;
  addUrl?: string | null;
}

/**
 * LINE 友だち追加促進カード。
 * LINE 連携済み（lineUserId あり）または addUrl 未設定の場合は何も表示しない。
 */
export default function LineFollowPrompt({ lineUserId, addUrl }: Props) {
  if (lineUserId || !addUrl) return null;

  return (
    <div className="bg-paper-soft p-4 space-y-2" style={{ border: "0.5px solid var(--color-border)" }}>
      <p className="font-serif text-xs text-ink-secondary leading-relaxed">
        TeraLog 公式 LINE と連携すると、参加する集いのリマインドが届きます。
      </p>
      <Link
        href={addUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 text-white font-sans text-sm hover:opacity-90 transition-opacity"
        style={{ background: "#06C755" }}
      >
        TeraLog 公式 LINE を友だち追加する
      </Link>
    </div>
  );
}
