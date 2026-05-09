export const MOODS = [
  { value: "PEACEFUL",   label: "穏やか",  icon: "🌿" },
  { value: "GRATEFUL",   label: "感謝",    icon: "🙏" },
  { value: "STRUGGLING", label: "葛藤",    icon: "🌊" },
  { value: "REFLECTIVE", label: "内省",    icon: "🪞" },
  { value: "JOYFUL",     label: "喜び",    icon: "☀️" },
] as const;

export type MoodValue = (typeof MOODS)[number]["value"];

export function getMoodLabel(value: string): string {
  return MOODS.find((m) => m.value === value)?.label ?? value;
}

export function getMoodIcon(value: string): string {
  return MOODS.find((m) => m.value === value)?.icon ?? "";
}
