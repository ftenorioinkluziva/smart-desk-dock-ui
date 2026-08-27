import { NextResponse } from "next/server"
import { isAuthResponse, requireCurrentUser } from "@/lib/current-user"
import { parseJsonBody, operationErrorResponse } from "@/lib/http/operation-response"
import {
  productivitySessionPatchSchema,
  productivitySessionTargetSchema,
} from "@/lib/productivity-session-contract"
import {
  deleteProductivitySession,
  getProductivitySession,
  saveProductivitySession,
} from "@/lib/productivity-session-store"
import { validationError } from "@/lib/operations/errors"

function readTarget(request: Request) {
  const target = productivitySessionTargetSchema.safeParse(new URL(request.url).searchParams.get("target"))
  return target.success ? target.data : null
}

export async function GET(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user
  const target = readTarget(request)
  if (!target) return operationErrorResponse(validationError("Invalid productivity session target", ["target"]))
  return NextResponse.json({ session: await getProductivitySession(user.id, target) })
}

export async function PATCH(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user
  const parsed = await parseJsonBody(request, productivitySessionPatchSchema)
  if (!parsed.ok) return operationErrorResponse(parsed.error)
  return NextResponse.json({ session: await saveProductivitySession(user.id, parsed.value) })
}

export async function DELETE(request: Request) {
  const user = await requireCurrentUser(request)
  if (isAuthResponse(user)) return user
  const target = readTarget(request)
  if (!target) return operationErrorResponse(validationError("Invalid productivity session target", ["target"]))
  await deleteProductivitySession(user.id, target)
  return NextResponse.json({ ok: true })
}
