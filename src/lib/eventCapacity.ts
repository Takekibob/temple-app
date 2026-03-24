/**
 * イベントの参加ステータスを決定する純粋関数
 *
 * @param capacity    定員（null = 無制限）
 * @param usedSeats   現在の確定済み合計人数（numGuests の合計）
 * @param numGuests   今回の申込人数
 */
export function determineParticipationStatus(
  capacity: number | null,
  usedSeats: number,
  numGuests: number
): "APPLIED" | "WAITLISTED" {
  if (capacity == null) return "APPLIED";
  if (usedSeats + numGuests > capacity) return "WAITLISTED";
  return "APPLIED";
}

/**
 * 残席数を計算する（null は無制限を意味する）
 */
export function calcRemainingSeats(
  capacity: number | null,
  usedSeats: number
): number | null {
  if (capacity == null) return null;
  return Math.max(0, capacity - usedSeats);
}
