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
  { id: "beep",    label: "Beep",    file: "/sounds/beep.mp3" },
  { id: "chime",   label: "Chime",   file: "/sounds/chime.mp3" },
  { id: "digital", label: "Digital", file: "/sounds/digital.mp3" },
  { id: "bell",    label: "Bell",    file: "/sounds/bell.mp3" },
  { id: "birds",   label: "Nature",  file: "/sounds/birds.mp3" },
] as const

export const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const
export const DAY_NAMES  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
