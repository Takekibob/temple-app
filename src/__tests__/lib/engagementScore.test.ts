import {
  calcDecay,
  calcEngagementScore,
  scoreToLabel,
  ACTION_POINTS,
  type EngagementAction,
} from "@/lib/engagementScore";

const NOW = new Date("2026-04-15T00:00:00Z");

describe("calcDecay", () => {
  it("当日のアクションは減衰なし（係数≒1）", () => {
    const decay = calcDecay(NOW, NOW);
    expect(decay).toBeCloseTo(1.0, 5);
  });

  it("30日後は約22%まで減衰する", () => {
    const past = new Date(NOW.getTime() - 30 * 86400000);
    const decay = calcDecay(past, NOW);
    // e^(-0.05 * 30) ≈ 0.2231
    expect(decay).toBeCloseTo(Math.exp(-0.05 * 30), 4);
  });

  it("90日後は約1%まで減衰する", () => {
    const past = new Date(NOW.getTime() - 90 * 86400000);
    const decay = calcDecay(past, NOW);
    expect(decay).toBeCloseTo(Math.exp(-0.05 * 90), 4);
    expect(decay).toBeLessThan(0.02);
  });

  it("未来のタイムスタンプは係数が1を超える（現実では発生しないが境界値テスト）", () => {
    const future = new Date(NOW.getTime() + 1 * 86400000);
    const decay = calcDecay(future, NOW);
    expect(decay).toBeGreaterThan(1);
  });
});

describe("calcEngagementScore", () => {
  it("アクションがない場合は 0 を返す", () => {
    expect(calcEngagementScore([], NOW)).toBe(0);
  });

  it("当日のイベント参加申込（+10）は 10 点になる", () => {
    const actions: EngagementAction[] = [
      { type: "event_apply", timestamp: NOW },
    ];
    expect(calcEngagementScore(actions, NOW)).toBe(10);
  });

  it("複数アクションの合計が正しく計算される", () => {
    const actions: EngagementAction[] = [
      { type: "event_apply", timestamp: NOW },    // +10
      { type: "event_attended", timestamp: NOW }, // +15
      { type: "event_feedback", timestamp: NOW }, // +5
    ];
    // 合計 = 30（減衰なし）
    expect(calcEngagementScore(actions, NOW)).toBe(30);
  });

  it("スコアは 100 でキャップされる", () => {
    const actions: EngagementAction[] = Array(20).fill({
      type: "kuyo_apply" as const, // +20 × 20 = 400
      timestamp: NOW,
    });
    expect(calcEngagementScore(actions, NOW)).toBe(100);
  });

  it("古いアクションは減衰して点数が低くなる", () => {
    const recent: EngagementAction[] = [
      { type: "event_apply", timestamp: NOW },
    ];
    const old30: EngagementAction[] = [
      { type: "event_apply", timestamp: new Date(NOW.getTime() - 30 * 86400000) },
    ];
    const scoreRecent = calcEngagementScore(recent, NOW);
    const scoreOld = calcEngagementScore(old30, NOW);
    expect(scoreRecent).toBeGreaterThan(scoreOld);
  });
});

describe("scoreToLabel", () => {
  it.each([
    [0, "低", false],
    [19, "低", false],
    [20, "中", false],
    [49, "中", false],
    [50, "高", true],
    [79, "高", true],
    [80, "最高", true],
    [100, "最高", true],
  ])("スコア %i → ラベル %s, 転換候補 %s", (score, label, candidate) => {
    const result = scoreToLabel(score);
    expect(result.label).toBe(label);
    expect(result.isConversionCandidate).toBe(candidate);
  });
});

describe("ACTION_POINTS", () => {
  it("設計書 §16.2 通りのポイントが定義されている", () => {
    expect(ACTION_POINTS.app_login).toBe(1);
    expect(ACTION_POINTS.news_view).toBe(2);
    expect(ACTION_POINTS.event_apply).toBe(10);
    expect(ACTION_POINTS.event_attended).toBe(15);
    expect(ACTION_POINTS.event_feedback).toBe(5);
    expect(ACTION_POINTS.kuyo_apply).toBe(20);
    expect(ACTION_POINTS.contact_sent).toBe(5);
    expect(ACTION_POINTS.consecutive_events_bonus).toBe(10);
  });
});
