"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

const TextArea = forwardRef<HTMLTextAreaElement, Props>(function TextArea(
  { className = "", ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`
        w-full bg-transparent resize-none
        border-b-[0.5px] border-border
        focus:border-ink focus:outline-none
        py-2 text-sm font-serif text-ink leading-relaxed
        placeholder:text-ink-tertiary placeholder:font-serif placeholder:font-light
        transition-colors
        ${className}
      `}
    />
  );
});

export default TextArea;
