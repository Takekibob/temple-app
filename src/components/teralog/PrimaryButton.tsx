import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export default function PrimaryButton({ children, loading, disabled, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        bg-ink text-white font-serif font-light
        px-6 py-3.5 text-sm tracking-button
        border-[0.5px] border-ink
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-opacity
        ${className}
      `}
    >
      {loading ? "処理中..." : children}
    </button>
  );
}
