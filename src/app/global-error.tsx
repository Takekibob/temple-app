"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// ルートレイアウトのエラーを捕捉するグローバルエラーバウンダリ
// このコンポーネントは <html>/<body> を自分でレンダリングする必要がある
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#faf9f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "20rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏛</div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#292524",
              marginBottom: "0.5rem",
            }}
          >
            システムエラー
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#78716c",
              marginBottom: "1.5rem",
            }}
          >
            深刻なエラーが発生しました。ページを再読み込みしてください。
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#a8a29e",
                marginBottom: "1rem",
                fontFamily: "monospace",
              }}
            >
              エラーコード: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#92400e",
              color: "white",
              border: "none",
              borderRadius: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
