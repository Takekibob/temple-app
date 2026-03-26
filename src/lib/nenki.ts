// 年忌計算ロジック（サーバー・クライアント両方で使用可）

export interface NenkiEntry {
  name: string;
  yearsAfter: number;
  year: number;
  date: Date;
}

export const NENKI_DEFS = [
  { name: "一周忌", yearsAfter: 1 },
  { name: "三回忌", yearsAfter: 2 },
  { name: "七回忌", yearsAfter: 6 },
  { name: "十三回忌", yearsAfter: 12 },
  { name: "十七回忌", yearsAfter: 16 },
  { name: "二十三回忌", yearsAfter: 22 },
  { name: "二十七回忌", yearsAfter: 26 },
  { name: "三十三回忌", yearsAfter: 32 },
  { name: "五十回忌", yearsAfter: 49 },
] as const;

/** 没年月日から全年忌一覧を返す */
export function calcNenki(deathDate: Date): NenkiEntry[] {
  return NENKI_DEFS.map(({ name, yearsAfter }) => {
    const d = new Date(deathDate);
    d.setFullYear(deathDate.getFullYear() + yearsAfter);
    return { name, yearsAfter, year: d.getFullYear(), date: d };
  });
}

/** 今日以降の直近年忌を返す（なければ null） */
export function getNextNenki(deathDate: Date): NenkiEntry | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return calcNenki(deathDate).find((e) => e.date >= today) ?? null;
}

/** 指定年に年忌がある場合その年忌名を返す（複数あり得ない） */
export function getNenkiForYear(deathDate: Date, year: number): NenkiEntry | null {
  return calcNenki(deathDate).find((e) => e.year === year) ?? null;
}

/**
 * 指定年の年忌に該当する「没年（西暦）」のリストを返す
 * 例: 2026年なら [2025, 2024, 2020, 2014, 2010, 2004, 2000, 1994, 1977]
 */
export function getNenkiDeathYearsForYear(year: number): number[] {
  return NENKI_DEFS.map((n) => year - n.yearsAfter);
}
