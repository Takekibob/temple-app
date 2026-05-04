type Props = {
  children: string;
  size?: "sm" | "md";
};

export default function SectionLabel({ children, size = "md" }: Props) {
  const fontSize = size === "sm" ? "text-[10px]" : "text-[11px]";
  return (
    <span
      className={`font-serif ${fontSize} text-ink-tertiary tracking-section font-light`}
    >
      {children}
    </span>
  );
}
