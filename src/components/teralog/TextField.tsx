"use client";

import { InputHTMLAttributes, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={`
        w-full bg-transparent
        border-b-[0.5px] border-border
        focus:border-ink focus:outline-none
        py-2 text-sm font-serif text-ink
        placeholder:text-ink-tertiary placeholder:font-serif placeholder:font-light
        transition-colors
        ${className}
      `}
    />
  );
});

export default TextField;
