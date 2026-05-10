const MORNING_MESSAGES = [
  "呼吸を整えて、今日を始めましょう",
  "朝の静けさに、耳を澄ませて",
  "ゆっくりと、目を覚ましていきましょう",
] as const;

const AFTERNOON_MESSAGES = [
  "今日も一日、丁寧に",
  "いまここに、ありますか",
  "小さな気づきを、大切に",
] as const;

const NIGHT_MESSAGES = [
  "今日の自分に、お疲れさまを",
  "一日の終わりに、深呼吸を",
  "ご縁に感謝して",
] as const;

/** Asia/Tokyo の現在時刻の時を返す */
function tokyoHour(): number {
  const now = new Date();
  const tokyoOffset = 9 * 60; // UTC+9
  const localOffset = now.getTimezoneOffset(); // 分単位、UTC-Xなら正
  const tokyoMs = now.getTime() + (tokyoOffset + localOffset) * 60 * 1000;
  return new Date(tokyoMs).getHours();
}

/**
 * 現在の Asia/Tokyo 時刻に応じた仏教的一言をランダム選択して返す。
 * 朝 5:00〜10:59 / 昼 11:00〜16:59 / 夜 17:00〜4:59
 */
export function getGreeting(): string {
  const hour = tokyoHour();
  let messages: readonly string[];
  if (hour >= 5 && hour < 11) {
    messages = MORNING_MESSAGES;
  } else if (hour >= 11 && hour < 17) {
    messages = AFTERNOON_MESSAGES;
  } else {
    messages = NIGHT_MESSAGES;
  }
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}
