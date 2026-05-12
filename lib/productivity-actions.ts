export const PRODUCTIVITY_CONTROL_EVENT = "focus-dock-productivity-control"

export type ProductivityTarget = "pomodoro" | "timer" | "stopwatch"
export type ProductivityAction = "start" | "pause" | "reset"

export type ProductivityControlDetail = {
  id: string
  target: ProductivityTarget
  action: ProductivityAction
  minutes?: number
}

export function dispatchProductivityControl(detail: Omit<ProductivityControlDetail, "id">) {
  if (typeof window === "undefined") return

  window.dispatchEvent(new CustomEvent<ProductivityControlDetail>(PRODUCTIVITY_CONTROL_EVENT, {
    detail: {
      ...detail,
      id: crypto.randomUUID(),
    },
  }))
}
