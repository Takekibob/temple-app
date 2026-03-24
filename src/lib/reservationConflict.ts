/**
 * 予約の時間帯が重複しているかチェックする純粋関数
 *
 * @param startA  予約Aの開始日時
 * @param durationA 予約Aの所要時間（分）
 * @param startB  予約Bの開始日時
 * @param durationB 予約Bの所要時間（分）
 */
export function hasTimeOverlap(
  startA: Date,
  durationA: number,
  startB: Date,
  durationB: number
): boolean {
  const endA = new Date(startA.getTime() + durationA * 60_000);
  const endB = new Date(startB.getTime() + durationB * 60_000);
  // [startA, endA) と [startB, endB) が交差するか
  return startA < endB && endA > startB;
}

/**
 * API ルートで使用している DB 問い合わせ不要の精密重複判定
 * (broad-filter でヒットした1件に対して正確に判定する)
 */
export function isPreciseOverlap(
  newStart: Date,
  newDurationMin: number,
  existingStart: Date,
  existingDurationMin: number
): boolean {
  return hasTimeOverlap(newStart, newDurationMin, existingStart, existingDurationMin);
}
