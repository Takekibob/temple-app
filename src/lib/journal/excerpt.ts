/** Markdownの記号を除去してプレーンテキストを返す */
export function stripMarkdown(content: string): string {
  return content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}(.+?)`{1,3}/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.+?)\]\(.*?\)/g, "$1")
    .replace(/>\s+/gm, "")
    .replace(/[-*+]\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 本文から抜粋を生成（最大 maxLength 文字） */
export function buildExcerpt(content: string, maxLength = 150): string {
  const text = stripMarkdown(content);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
