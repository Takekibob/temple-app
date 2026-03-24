import {
  determineParticipationStatus,
  calcRemainingSeats,
} from "@/lib/eventCapacity";

describe("determineParticipationStatus", () => {
  describe("定員なし（capacity = null）", () => {
    it("何人申込んでも APPLIED を返す", () => {
      expect(determineParticipationStatus(null, 0, 1)).toBe("APPLIED");
      expect(determineParticipationStatus(null, 999, 6)).toBe("APPLIED");
    });
  });

  describe("定員あり", () => {
    it("空席がある場合は APPLIED を返す", () => {
      // 定員30, 使用済み20, 今回2名 → 合計22 ≤ 30
      expect(determineParticipationStatus(30, 20, 2)).toBe("APPLIED");
    });

    it("ちょうど定員の場合は APPLIED を返す", () => {
      // 定員30, 使用済み28, 今回2名 → 合計30 = 30
      expect(determineParticipationStatus(30, 28, 2)).toBe("APPLIED");
    });

    it("定員を1名超える場合は WAITLISTED を返す", () => {
      // 定員30, 使用済み28, 今回3名 → 合計31 > 30
      expect(determineParticipationStatus(30, 28, 3)).toBe("WAITLISTED");
    });

    it("定員が満席（使用済み=定員）の場合は WAITLISTED を返す", () => {
      expect(determineParticipationStatus(30, 30, 1)).toBe("WAITLISTED");
    });

    it("定員が0の場合は常に WAITLISTED を返す", () => {
      expect(determineParticipationStatus(0, 0, 1)).toBe("WAITLISTED");
    });

    it("1名定員に1名申込は APPLIED", () => {
      expect(determineParticipationStatus(1, 0, 1)).toBe("APPLIED");
    });

    it("1名定員に2名申込は WAITLISTED", () => {
      expect(determineParticipationStatus(1, 0, 2)).toBe("WAITLISTED");
    });
  });
});

describe("calcRemainingSeats", () => {
  it("定員なしは null を返す", () => {
    expect(calcRemainingSeats(null, 10)).toBeNull();
  });

  it("正しい残席数を返す", () => {
    expect(calcRemainingSeats(30, 20)).toBe(10);
    expect(calcRemainingSeats(30, 28)).toBe(2);
    expect(calcRemainingSeats(30, 30)).toBe(0);
  });

  it("usedSeats が capacity を超えても 0 以下にならない", () => {
    expect(calcRemainingSeats(30, 35)).toBe(0);
  });
});
