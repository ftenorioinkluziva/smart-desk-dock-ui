"use client"

import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  async function signInWithGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    })
  }

  if (isPending) {
    return (
      <main className="flex h-dvh w-dvw items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </main>
    )
  }

  if (!session?.user) {
    return (
      <main className="flex h-dvh w-dvw items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-[20rem] text-center">
          <div className="text-[clamp(1.4rem,5vw,2rem)] font-semibold leading-tight">
            Focus Dock
          </div>
          <p className="mt-2 text-[clamp(0.75rem,2vw,0.9rem)] text-muted-foreground">
            Entre com sua conta Google para carregar suas configuracoes.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mt-5 w-full rounded-lg bg-accent px-4 py-2 text-[clamp(0.78rem,2vw,0.95rem)] font-medium text-accent-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Entrar com Google
          </button>
        </section>
      </main>
    )
  }

  return <>{children}</>
}

