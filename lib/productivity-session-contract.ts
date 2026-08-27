import { z } from "zod"

export const productivitySessionTargetSchema = z.enum(["pomodoro", "timer"])
export const productivitySessionModeSchema = z.enum(["focus", "short-break", "long-break"])

export const productivitySessionSchema = z.object({
  target: productivitySessionTargetSchema,
  mode: productivitySessionModeSchema.nullable(),
  totalSeconds: z.number().int().min(0).max(24 * 60 * 60),
  isRunning: z.boolean(),
  isAlertVisible: z.boolean(),
  sessions: z.number().int().min(0).max(100000),
  endAt: z.string().datetime({ offset: true }).nullable(),
}).strict()

export const productivitySessionPatchSchema = productivitySessionSchema

export type ProductivitySession = z.infer<typeof productivitySessionSchema>
export type ProductivitySessionTarget = z.infer<typeof productivitySessionTargetSchema>
