import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getProductivityAudioStatus,
  primeProductivityAudio,
  testProductivityAudio,
} from "@/lib/productivity-settings"

class FakeOscillator {
  frequency = { value: 0 }
  type = "sine"
  onended: (() => void) | null = null

  connect() {
    return this
  }

  start() {}

  stop() {
    this.onended?.()
  }
}

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }

  connect() {
    return this
  }
}

class FakeAudioContext {
  state: AudioContextState = "suspended"
  currentTime = 0
  destination = {}
  resume = vi.fn(async () => {
    this.state = "running"
  })

  createOscillator() {
    return new FakeOscillator()
  }

  createGain() {
    return new FakeGain()
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("productivity audio activation", () => {
  it("primes once from a user gesture and reuses the context for the test tone", async () => {
    const fakeWindow = {
      AudioContext: FakeAudioContext,
      CustomEvent,
      dispatchEvent: vi.fn(),
    }
    vi.stubGlobal("window", fakeWindow)

    expect(getProductivityAudioStatus()).toBe("needs-activation")
    await expect(primeProductivityAudio()).resolves.toBe("ready")
    expect(getProductivityAudioStatus()).toBe("ready")
    await expect(testProductivityAudio()).resolves.toBe("ready")
    expect(fakeWindow.dispatchEvent).toHaveBeenCalled()
  })
})
