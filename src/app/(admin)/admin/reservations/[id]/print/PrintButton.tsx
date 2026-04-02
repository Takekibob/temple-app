"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-900"
    >
      印刷する
    </button>
  );
}
