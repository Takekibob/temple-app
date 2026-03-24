import { hasTimeOverlap, isPreciseOverlap } from "@/lib/reservationConflict";

// ヘルパー: YYYY-MM-DD HH:MM を Date に変換
const d = (s: string) => new Date(s);

describe("hasTimeOverlap", () => {
  describe("重複あり", () => {
    it("完全に一致する場合", () => {
      expect(hasTimeOverlap(d("2026-04-15T10:00:00"), 60, d("2026-04-15T10:00:00"), 60)).toBe(true);
    });

    it("新規予約が既存予約の途中で開始する場合", () => {
      // 既存: 10:00-11:00, 新規: 10:30-11:30
      expect(hasTimeOverlap(d("2026-04-15T10:30:00"), 60, d("2026-04-15T10:00:00"), 60)).toBe(true);
    });

    it("新規予約が既存予約を内包する場合", () => {
      // 既存: 10:00-11:00, 新規: 09:00-12:00
      expect(hasTimeOverlap(d("2026-04-15T09:00:00"), 180, d("2026-04-15T10:00:00"), 60)).toBe(true);
    });

    it("既存予約が新規予約を内包する場合", () => {
      // 既存: 09:00-12:00, 新規: 10:00-11:00
      expect(hasTimeOverlap(d("2026-04-15T10:00:00"), 60, d("2026-04-15T09:00:00"), 180)).toBe(true);
    });

    it("新規予約が既存予約の終了直前まで続く場合", () => {
      // 既存: 10:00-11:00, 新規: 09:30-10:30
      expect(hasTimeOverlap(d("2026-04-15T09:30:00"), 60, d("2026-04-15T10:00:00"), 60)).toBe(true);
    });
  });

  describe("重複なし", () => {
    it("新規予約が既存予約の後に連続する場合（端点除外）", () => {
      // 既存: 10:00-11:00, 新規: 11:00-12:00
      expect(hasTimeOverlap(d("2026-04-15T11:00:00"), 60, d("2026-04-15T10:00:00"), 60)).toBe(false);
    });

    it("新規予約が既存予約の前に終わる場合（端点除外）", () => {
      // 既存: 11:00-12:00, 新規: 10:00-11:00
      expect(hasTimeOverlap(d("2026-04-15T10:00:00"), 60, d("2026-04-15T11:00:00"), 60)).toBe(false);
    });

    it("新規予約が翌日の場合", () => {
      expect(hasTimeOverlap(d("2026-04-16T10:00:00"), 60, d("2026-04-15T10:00:00"), 60)).toBe(false);
    });

    it("新規予約が大きく前の場合", () => {
      expect(hasTimeOverlap(d("2026-04-15T08:00:00"), 60, d("2026-04-15T10:00:00"), 60)).toBe(false);
    });
  });
});

describe("isPreciseOverlap（エイリアス）", () => {
  it("hasTimeOverlap と同じ結果を返す", () => {
    const start = d("2026-04-15T10:00:00");
    expect(isPreciseOverlap(start, 60, start, 60)).toBe(
      hasTimeOverlap(start, 60, start, 60)
    );
  });
});
