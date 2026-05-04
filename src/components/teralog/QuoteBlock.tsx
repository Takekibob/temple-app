import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  author?: string;
  thanks?: number;
  onThanksClick?: () => void;
};

export default function QuoteBlock({ children, author, thanks, onThanksClick }: Props) {
  return (
    <div className="pl-4" style={{ borderLeft: "0.5px solid #1A1A1A" }}>
      <div className="font-serif text-sm text-ink font-light leading-[2]">
        {children}
      </div>
      {(author || thanks !== undefined) && (
        <div className="mt-3 flex items-center justify-between">
          {author && (
            <span className="font-serif text-[11px] text-ink-tertiary tracking-section font-light">
              {author}
            </span>
          )}
          {thanks !== undefined && (
            <button
              type="button"
              onClick={onThanksClick}
              className="font-serif text-[11px] text-ink-tertiary tracking-section font-light"
            >
              ありがとう · {thanks}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
