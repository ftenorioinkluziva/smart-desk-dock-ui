"use client"

import { Component, type ReactNode } from "react"

interface Props {
  panelId: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[Panel ${this.props.panelId}] render error:`, error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex size-full items-center justify-center text-muted-foreground text-xs p-4 text-center">
          <span>Painel {this.props.panelId} indisponível</span>
        </div>
      )
    }
    return this.props.children
  }
}
