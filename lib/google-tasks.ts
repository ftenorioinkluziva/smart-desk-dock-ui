import { z } from "zod"
import { OperationFailure, upstreamError } from "@/lib/operations/errors"

const GOOGLE_TASKS_API = "https://tasks.googleapis.com/tasks/v1"

type GoogleTaskListResponse = {
  id: string
  title: string
  updated?: string
}

type GoogleTaskResponse = {
  id: string
  title?: string
  notes?: string
  due?: string
  completed?: string
  updated?: string
  status?: "needsAction" | "completed"
  deleted?: boolean
  hidden?: boolean
  parent?: string
  position?: string
}

const googleTaskListSchema: z.ZodType<GoogleTaskListResponse> = z.object({
  id: z.string(),
  title: z.string(),
  updated: z.string().optional(),
}).passthrough()

const googleTaskSchema: z.ZodType<GoogleTaskResponse> = z.object({
  id: z.string(),
  title: z.string().optional(),
  notes: z.string().optional(),
  due: z.string().optional(),
  completed: z.string().optional(),
  updated: z.string().optional(),
  status: z.enum(["needsAction", "completed"]).optional(),
  deleted: z.boolean().optional(),
  hidden: z.boolean().optional(),
  parent: z.string().optional(),
  position: z.string().optional(),
}).passthrough()

const pageSchema = z.object({
  items: z.array(z.unknown()).optional(),
  nextPageToken: z.string().optional(),
}).passthrough()

export type GoogleTaskList = {
  id: string
  title: string
}

export type GoogleTask = {
  id: string
  taskListId: string
  taskListTitle: string
  title: string
  notes: string | null
  due: string | null
  completed: boolean
  updated: string | null
}

function getRetryDelay(attempt: number) {
  return 250 * 2 ** attempt
}

async function wait(delayMs: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
}

async function requestGoogleTasks(
  url: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const method = init.method ?? "GET"
  const maxAttempts = method === "GET" ? 2 : 1
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (response.ok) return response

    lastResponse = response
    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt === maxAttempts - 1) break
    await wait(getRetryDelay(attempt))
  }

  if (lastResponse?.status === 401 || lastResponse?.status === 403) {
    throw new OperationFailure({
      code: "GOOGLE_TASKS_AUTH_REQUIRED",
      category: "authorization",
      message: "A autorização do Google Tasks é necessária",
      hint: "Autorize o acesso ao Google Tasks e tente novamente",
      retryable: false,
    })
  }

  throw new OperationFailure(upstreamError("GOOGLE_TASKS_REQUEST_FAILED", "Google Tasks request failed", {
    retryable: lastResponse ? lastResponse.status === 429 || lastResponse.status >= 500 : true,
  }))
}

async function fetchPage<T>(url: string, accessToken: string, itemSchema: z.ZodType<T>) {
  const response = await requestGoogleTasks(url, accessToken)
  const parsed = pageSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new OperationFailure(upstreamError("GOOGLE_TASKS_RESPONSE_INVALID", "Google Tasks returned an invalid response", { retryable: false }))
  }

  const items = parsed.data.items ?? []
  const validatedItems = items.map((item) => itemSchema.safeParse(item)).filter((item) => item.success)
  if (validatedItems.length !== items.length) {
    throw new OperationFailure(upstreamError("GOOGLE_TASKS_RESPONSE_INVALID", "Google Tasks returned an invalid item", { retryable: false }))
  }

  return {
    items: validatedItems.map((item) => item.data),
    nextPageToken: parsed.data.nextPageToken,
  }
}

async function fetchAllPages<T>(
  url: string,
  accessToken: string,
  itemSchema: z.ZodType<T>,
) {
  const items: T[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({ maxResults: "100" })
    if (pageToken) params.set("pageToken", pageToken)
    const page = await fetchPage(`${url}?${params.toString()}`, accessToken, itemSchema)
    items.push(...page.items)
    pageToken = page.nextPageToken
  } while (pageToken)

  return items
}

function normalizeTask(task: GoogleTaskResponse, taskListId: string, taskListTitle: string): GoogleTask | null {
  if (task.deleted || task.hidden || task.status === "completed") return null

  return {
    id: task.id,
    taskListId,
    taskListTitle,
    title: task.title?.trim() || "Sem título",
    notes: task.notes?.trim() || null,
    due: task.due ?? null,
    completed: false,
    updated: task.updated ?? null,
  }
}

export async function fetchGoogleTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const taskLists = await fetchAllPages(
    `${GOOGLE_TASKS_API}/users/@me/lists`,
    accessToken,
    googleTaskListSchema,
  )

  return taskLists.map((taskList) => ({
    id: taskList.id,
    title: taskList.title.trim() || "Sem nome",
  }))
}

export async function fetchGoogleTasks(accessToken: string): Promise<{ taskLists: GoogleTaskList[]; tasks: GoogleTask[] }> {
  const taskLists = await fetchGoogleTaskLists(accessToken)
  const tasksByList = await Promise.all(taskLists.map(async (taskList) => {
    const tasks = await fetchAllPages(
      `${GOOGLE_TASKS_API}/lists/${encodeURIComponent(taskList.id)}/tasks`,
      accessToken,
      googleTaskSchema,
    )
    return tasks
      .map((task) => normalizeTask(task, taskList.id, taskList.title))
      .filter((task): task is GoogleTask => Boolean(task))
  }))

  return {
    taskLists,
    tasks: tasksByList.flat(),
  }
}

export async function updateGoogleTaskStatus({
  accessToken,
  taskListId,
  taskId,
  completed,
}: {
  accessToken: string
  taskListId: string
  taskId: string
  completed: boolean
}) {
  const response = await requestGoogleTasks(
    `${GOOGLE_TASKS_API}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: completed ? "completed" : "needsAction" }),
    },
  )
  const parsed = googleTaskSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new OperationFailure(upstreamError("GOOGLE_TASKS_RESPONSE_INVALID", "Google Tasks returned an invalid task", { retryable: false }))
  }

  return parsed.data
}
