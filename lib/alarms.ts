export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Alarm = {
  id: string
  hour: number     // 0–23
  minute: number   // 0–59
  days: DayOfWeek[] // [] = fires every day
  enabled: boolean
  sound: string
}

export const SOUNDS = [
  { id: "Sound 1",    label: "S",    file: "/sounds/Chill_Hip_Hop_Alarm_2.mp3" },
  { id: "Sound 2",   label: "C",   file: "/sounds/Chill_Hip_Hop_Alarm_4.mp3" },
  { id: "Sound 3", label: "D", file: "/sounds/Lo_fi_alarm_for_wak_1.mp3" },
  { id: "Sound 4",    label: "B",    file: "/sounds/Lo_fi_alarm_for_wak_3.mp3" },
  { id: "Sound 5",   label: "N",  file: "/sounds/Lo_fi_alarm_for_wak_4.mp3" },
] as const

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const
export const DAY_NAMES  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
