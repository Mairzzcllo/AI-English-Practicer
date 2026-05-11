// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSpeechSynthesis } from "./useSpeechSynthesis"

class MockUtterance {
  lang = "en-US"
  rate = 1
  pitch = 1
  volume = 1
  text: string
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}

let lastUtterance: MockUtterance | null = null

function mockSpeechSynthesis() {
  lastUtterance = null

  Object.defineProperty(window, "speechSynthesis", {
    value: {
      speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
        lastUtterance = utterance as unknown as MockUtterance
      }),
      cancel: vi.fn(),
      pending: false,
      speaking: false,
      paused: false,
    },
    writable: true,
    configurable: true,
  })

  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: MockUtterance,
    writable: true,
    configurable: true,
  })
}

function getUtterance(): MockUtterance {
  expect(lastUtterance).not.toBeNull()
  return lastUtterance!
}

beforeEach(() => {
  mockSpeechSynthesis()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useSpeechSynthesis", () => {
  it("returns isSupported when speechSynthesis exists", () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    expect(result.current.isSupported).toBe(true)
  })

  it("returns isSupported false when speechSynthesis is missing", () => {
    delete (window as Record<string, unknown>).speechSynthesis
    const { result } = renderHook(() => useSpeechSynthesis())
    expect(result.current.isSupported).toBe(false)
  })

  it("speak creates utterance with correct lang and rate", async () => {
    const { result } = renderHook(() => useSpeechSynthesis({ lang: "zh-CN", rate: 0.7 }))

    await act(async () => {
      const promise = result.current.speak("你好")
      const utterance = getUtterance()
      expect(utterance.lang).toBe("zh-CN")
      expect(utterance.rate).toBe(0.7)
      utterance.onend?.()
      await promise
    })
  })

  it("speak resolves when utterance ends", async () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    let resolved = false

    await act(async () => {
      result.current.speak("hello").then(() => { resolved = true })
      // speak is synchronous (promise creation + utterance setup), so
      // by now lastUtterance should be populated
      const utterance = getUtterance()
      utterance.onend?.()
    })

    expect(resolved).toBe(true)
  })

  it("speak resolves when utterance errors", async () => {
    const { result } = renderHook(() => useSpeechSynthesis())
    let resolved = false

    await act(async () => {
      result.current.speak("hello").then(() => { resolved = true })
      const utterance = getUtterance()
      utterance.onerror?.()
    })

    expect(resolved).toBe(true)
  })

  it("cancel calls window.speechSynthesis.cancel", () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    act(() => result.current.cancel())

    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })

  it("tracks isSpeaking state", async () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    expect(result.current.isSpeaking).toBe(false)

    await act(async () => {
      result.current.speak("hello")
    })

    expect(result.current.isSpeaking).toBe(true)

    await act(async () => {
      const utterance = getUtterance()
      utterance.onend?.()
    })

    expect(result.current.isSpeaking).toBe(false)
  })

  it("cancels previous utterance before starting new one", async () => {
    const { result } = renderHook(() => useSpeechSynthesis())

    await act(async () => {
      result.current.speak("first")
      result.current.speak("second")

      expect(window.speechSynthesis.cancel).toHaveBeenCalled()
      const u2 = getUtterance()
      expect(u2.text).toBe("second")
      u2.onend?.()
    })
  })
})
