"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, ListTodo, Loader2, RefreshCw } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { DockDataSourceError, useDockDataSource } from "@/components/dock-runtime-provider"
import { GOOGLE_TASKS_SCOPE } from "@/lib/google-scopes"
import { googleTasksApiResponseSchema } from "@/lib/operations/contracts"
import { readUserCache, writeUserCache } from "@/lib/user-cache"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DockPanelId } from "@/lib/dock-panels"

type TaskItem = {
  id: string
  taskListId: string
  taskListTitle: string
  title: string
  notes: string | null
  due: string | null
  completed: boolean
  updated: string | null
}

function formatDueDate(due: string | null) {
  if (!due) return null
  const date = new Date(due)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

type TodayTasksProps = {
  variant?: "summary" | "focus"
  panelId?: DockPanelId
}

export function TodayTasks({ variant = "summary", panelId = "today" }: TodayTasksProps) {
  const { data: session } = authClient.useSession()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const response = await fetch("/api/google-tasks", { cache: "no-store" })
    const payload: unknown = await response.json()
    const parsed = googleTasksApiResponseSchema.safeParse(payload)
    if (!parsed.success) throw new DockDataSourceError("INVALID_RESPONSE")
    if (!response.ok) {
      throw new DockDataSourceError(parsed.data.tasksAuthRequired || response.status === 403 ? "UNAUTHORIZED" : "UPSTREAM_UNAVAILABLE")
    }
    writeUserCache(session?.user?.id, "google-tasks", parsed.data)
    return parsed.data
  }, [session?.user?.id])

  const tasksSource = useDockDataSource("tasks", fetchTasks, {
    panelId,
    schema: googleTasksApiResponseSchema,
  })

  useEffect(() => {
    const cached = readUserCache(session?.user?.id, "google-tasks", googleTasksApiResponseSchema)
    if (cached) {
      setTasks(cached.data.tasks ?? [])
      setCachedAt(cached.savedAt)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!tasksSource.data) return
    setTasks(tasksSource.data.tasks ?? [])
    setCachedAt(tasksSource.state.updatedAt)
    setActionError(null)
  }, [tasksSource.data, tasksSource.state.updatedAt])

  const isLoading = tasksSource.isLoading
  const tasksAuthRequired = tasksSource.state.status === "unauthorized"
  const isStale = tasksSource.isStale || (tasksSource.data === null && tasks.length > 0)
  const error = actionError ?? (
    tasksSource.state.status === "error" ? "Google Tasks indisponível" : null
  )
  const headingId = variant === "focus" ? "focus-tasks-heading" : "today-tasks-heading"
  const isSummary = variant === "summary"

  async function authorizeTasks() {
    setIsAuthorizing(true)
    setActionError(null)
    const result = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/",
      scopes: [GOOGLE_TASKS_SCOPE],
    })
    if (result.error) {
      setIsAuthorizing(false)
      setActionError("Não foi possível abrir a autorização do Google Tasks")
    }
  }

  async function completeTask(task: TaskItem) {
    if (updatingTaskId) return
    setUpdatingTaskId(task.id)
    setActionError(null)
    setTasks((current) => current.filter((item) => item.id !== task.id))

    try {
      const response = await fetch("/api/google-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskListId: task.taskListId,
          taskId: task.id,
          completed: true,
        }),
      })
      if (!response.ok) throw new Error("Task update failed")
      window.setTimeout(() => tasksSource.refresh(), 350)
    } catch {
      setTasks((current) => [task, ...current])
      setActionError("Não foi possível concluir a tarefa")
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const visibleTasks = isSummary ? tasks.slice(0, 3) : tasks

  return (
    <section
      aria-labelledby={headingId}
      className={`min-w-0 rounded-xl border border-border/35 bg-secondary/20 px-[clamp(0.65rem,1.55vw,0.95rem)] py-[clamp(0.5rem,1.15vh,0.7rem)] ${isSummary ? "w-full max-w-[16rem]" : "flex h-full min-h-0 w-full flex-col overflow-hidden"}`}
    >
      <div className="flex items-center justify-between gap-2 text-muted-foreground" style={{ fontSize: "clamp(0.62rem,1.6vw,0.76rem)" }}>
        <div className="flex min-w-0 items-center gap-1.5">
          <ListTodo className="size-3.5 shrink-0" />
          <h2 id={headingId} className="truncate uppercase tracking-[0.12em]">{isSummary ? "Tarefas" : "Tarefas do foco"}</h2>
          {tasks.length > 0 && <span className="font-mono tabular-nums text-muted-foreground/55">{tasks.length}</span>}
        </div>
        <button
          type="button"
          onClick={() => tasksSource.refresh()}
          disabled={isLoading}
          aria-label="Atualizar tarefas"
          className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/65 transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <RefreshCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {tasksAuthRequired ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <p className="text-muted-foreground/65" style={{ fontSize: "clamp(0.68rem,1.75vw,0.82rem)" }}>
            Autorize a conta Google para visualizar suas tarefas.
          </p>
          <button
            type="button"
            onClick={() => void authorizeTasks()}
            disabled={isAuthorizing}
            className="flex items-center justify-center gap-1 rounded-md border border-border/50 bg-secondary/35 px-2 py-1 text-foreground transition-colors hover:bg-secondary/65 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            style={{ fontSize: "clamp(0.62rem,1.6vw,0.74rem)" }}
          >
            {isAuthorizing ? <Loader2 className="size-3 animate-spin" /> : null}
            {isAuthorizing ? "Abrindo autorização" : "Autorizar Google Tasks"}
          </button>
        </div>
      ) : isSummary ? (
        tasks.length > 0 ? (
          <div className="mt-1.5 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[clamp(1.25rem,3.4vw,1.7rem)] font-medium tabular-nums text-foreground">{tasks.length}</span>
              <span className="text-muted-foreground/70" style={{ fontSize: "clamp(0.68rem,1.7vw,0.8rem)" }}>pendentes</span>
            </div>
            <p className="mt-0.5 truncate text-foreground/80" title={tasks[0].title} style={{ fontSize: "clamp(0.68rem,1.7vw,0.82rem)" }}>
              Próxima: {tasks[0].title}
            </p>
            {tasks.length > 1 && (
              <p className="mt-0.5 truncate text-muted-foreground/50" style={{ fontSize: "clamp(0.58rem,1.35vw,0.66rem)" }}>
                +{tasks.length - 1} no Google Tasks
              </p>
            )}
          </div>
        ) : isLoading ? (
          <div className="mt-2 flex items-center gap-1.5 text-muted-foreground/60" style={{ fontSize: "clamp(0.68rem,1.75vw,0.82rem)" }}>
            <Loader2 className="size-3 animate-spin" />
            Carregando tarefas
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground/60" style={{ fontSize: "clamp(0.68rem,1.75vw,0.82rem)" }}>
            Nenhuma tarefa pendente.
          </p>
        )
      ) : visibleTasks.length > 0 ? (
        <div
          className={`dock-list-scroll mt-1.5 min-h-0 flex flex-col gap-0.5 overscroll-contain pr-1 ${isSummary ? "" : "flex-1 overflow-y-auto"}`}
          tabIndex={isSummary ? undefined : 0}
          aria-label={isSummary ? undefined : "Lista de tarefas do foco"}
        >
          {visibleTasks.map((task) => {
            const due = formatDueDate(task.due)
            return (
              <div key={`${task.taskListId}:${task.id}`} className="flex min-w-0 items-center gap-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => void completeTask(task)}
                  disabled={updatingTaskId === task.id}
                  aria-label={`Concluir tarefa: ${task.title}`}
                  className="flex size-4 shrink-0 items-center justify-center rounded border border-border/60 text-transparent transition-colors hover:border-foreground/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {updatingTaskId === task.id ? <Loader2 className="size-2.5 animate-spin" /> : <Check className="size-2.5" />}
                </button>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      title={task.title}
                      aria-label={`Ler nome completo da tarefa: ${task.title}`}
                      className="min-w-0 flex-1 line-clamp-2 break-words text-left leading-tight text-foreground/85 transition-colors hover:text-foreground focus-visible:z-10 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                      style={{ fontSize: "clamp(0.7rem,1.8vw,0.84rem)" }}
                    >
                      {task.title}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-[min(20rem,calc(100vw-2rem))] border-border/70 bg-card p-3 shadow-none"
                  >
                    <p className="break-words text-left font-medium leading-snug text-foreground" style={{ fontSize: "clamp(0.82rem,2vw,1rem)" }}>
                      {task.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-left text-muted-foreground/65" style={{ fontSize: "clamp(0.58rem,1.35vw,0.68rem)" }}>
                      <span>{task.taskListTitle}</span>
                      {due && <span className="font-mono tabular-nums">Vence {due}</span>}
                    </div>
                  </PopoverContent>
                </Popover>
                {due && <span className="shrink-0 font-mono tabular-nums text-muted-foreground/55" style={{ fontSize: "clamp(0.58rem,1.45vw,0.68rem)" }}>{due}</span>}
              </div>
            )
          })}
          {isSummary && tasks.length > visibleTasks.length && (
            <span className="pt-0.5 text-muted-foreground/50" style={{ fontSize: "clamp(0.6rem,1.5vw,0.7rem)" }}>
              +{tasks.length - visibleTasks.length} tarefas no Google Tasks
            </span>
          )}
        </div>
      ) : isLoading ? (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground/60" style={{ fontSize: "clamp(0.68rem,1.75vw,0.82rem)" }}>
          <Loader2 className="size-3 animate-spin" />
          Carregando tarefas
        </div>
      ) : (
        <p className="mt-2 text-muted-foreground/60" style={{ fontSize: "clamp(0.68rem,1.75vw,0.82rem)" }}>
          Nenhuma tarefa pendente.
        </p>
      )}

      {error && !tasksAuthRequired && (
        <p className="mt-1 text-destructive/85" style={{ fontSize: "clamp(0.58rem,1.45vw,0.68rem)" }}>{error}</p>
      )}
      {cachedAt && isStale && !error && (
        <p className="mt-1 text-muted-foreground/55" style={{ fontSize: "clamp(0.54rem,1.3vw,0.64rem)" }}>
          Snapshot de {new Date(cachedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}; aguardando atualização.
        </p>
      )}
    </section>
  )
}
