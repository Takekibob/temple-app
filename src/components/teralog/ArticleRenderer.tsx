"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

export default function ArticleRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="font-serif text-[24px] font-medium text-ink leading-snug mt-10 mb-4" style={{ letterSpacing: "0.05em" }}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-serif text-[20px] font-medium text-ink leading-snug mt-8 mb-3" style={{ letterSpacing: "0.05em", borderBottom: "0.5px solid #E5E5E5", paddingBottom: "0.5rem" }}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-serif text-[17px] font-medium text-ink leading-snug mt-6 mb-2">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="font-serif text-base text-ink font-light mb-5" style={{ lineHeight: "2.2" }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-medium text-ink">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="font-serif text-ink-secondary">{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote
            className="pl-5 my-6 font-serif text-ink-secondary font-light"
            style={{ borderLeft: "0.5px solid #1A1A1A", lineHeight: "2.2" }}
          >
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="my-4 space-y-1 pl-6 font-serif text-base text-ink font-light" style={{ lineHeight: "2" }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 space-y-1 pl-6 font-serif text-base text-ink font-light list-decimal" style={{ lineHeight: "2" }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="font-serif text-base text-ink font-light">{children}</li>
        ),
        a: ({ href, children }) => (
          <a href={href} className="font-serif text-ink border-b-[0.5px] border-ink" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        img: ({ src, alt }) => (
          <span className="block my-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt ?? ""} className="w-full object-cover" />
            {alt && (
              <span className="block font-serif text-[11px] text-ink-tertiary font-light mt-1.5 text-center tracking-section">
                {alt}
              </span>
            )}
          </span>
        ),
        hr: () => (
          <hr className="my-8" style={{ border: "none", borderTop: "0.5px solid #E5E5E5" }} />
        ),
        code: ({ children }) => (
          <code className="font-sans text-[13px] bg-paper-soft px-1.5 py-0.5 text-ink">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-paper-soft p-4 my-5 overflow-x-auto font-sans text-sm text-ink">
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
