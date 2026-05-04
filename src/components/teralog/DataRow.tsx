import { ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  labelWidth?: number;
};

export default function DataRow({ label, children, labelWidth = 80 }: Props) {
  return (
    <div className="flex gap-4 py-3 border-b-[0.5px] border-border-thin">
      <dt
        className="font-serif text-[11px] text-ink-tertiary tracking-section font-light shrink-0 pt-0.5"
        style={{ width: labelWidth }}
      >
        {label}
      </dt>
      <dd className="font-serif text-sm text-ink font-light leading-relaxed flex-1 min-w-0">
        {children}
      </dd>
    </div>
  );
}
