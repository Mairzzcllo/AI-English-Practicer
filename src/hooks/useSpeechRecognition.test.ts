// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSpeechRecognition } from "./useSpeechRecognition"

const sharedStart = vi.fn()
const sharedStop = vi.fn()
const sharedAbort = vi.fn()

class MockSpeechRecognition {
  static latestInstance: MockSpeechRecognition | null = null
  constructor() {
    MockSpeechRecognition.latestInstance = this
  }
  start = sharedStart
  stop = sharedStop
  abort = sharedAbort
  lang = ""
  continuous = false
  interimResults = false
  onresult: ((event: Partial<SpeechRecognitionEvent>) => void) | null = null
  onerror: ((event: Partial<SpeechRecognitionErrorEvent>) => void) | null = null
  onend: (() => void) | null = null
}

function mockSpeechRecognitionAPI() {
  MockSpeechRecognition.latestInstance = null

  Object.defineProperty(window, "SpeechRecognition", {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })
  Object.defineProperty(window, "webkitSpeechRecognition", {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  })

  sharedStart.mockClear()
  sharedStop.mockClear()
  sharedAbort.mockClear()
}

function getRecognition() {
  return MockSpeechRecognition.latestInstance!
}

function fireResult(
  finalTexts: string[],
  interimTexts: string[] = [],
  resultIndex = 0
) {
  const rec = getRecognition()
  if (!rec.onresult) return
  const results: SpeechRecognitionResult[] = []

  for (const text of finalTexts) {
    results.push({
      isFinal: true,
      length: 1,
      item: () =>
        ({ transcript: text, confidence: 0.9 }) as SpeechRecognitionAlternative,
      [0]: { transcript: text, confidence: 0.9 } as SpeechRecognitionAlternative,
    } as SpeechRecognitionResult)
  }
  for (const text of interimTexts) {
    results.push({
      isFinal: false,
      length: 1,
      item: () =>
        ({ transcript: text, confidence: 0.5 }) as SpeechRecognitionAlternative,
      [0]: { transcript: text, confidence: 0.5 } as SpeechRecognitionAlternative,
    } as SpeechRecognitionResult)
  }

  rec.onresult({
    resultIndex,
    results: results as unknown as SpeechRecognitionResultList,
  } as Partial<SpeechRecognitionEvent>)
}

function fireError(error: string) {
  const rec = getRecognition()
  if (!rec.onerror) return
  rec.onerror({ error, message: "" } as Partial<SpeechRecognitionErrorEvent>)
}

function fireEnd() {
  const rec = getRecognition()
  if (!rec.onend) return
  rec.onend()
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("useSpeechRecognition", () => {
  it("starts listening and calls recognition.start()", () => {
    mockSpeechRecognitionAPI()
    const { result } = renderHook(() => useSpeechRecognition())

    expect(result.current.isListening).toBe(false)
    act(() => result.current.startListening())
    expect(result.current.isListening).toBe(true)
    expect(sharedStart).toHaveBeenCalledTimes(1)
  })

  it("creates recognition with correct options", () => {
    mockSpeechRecognitionAPI()
    const { result } = renderHook(() =>
      useSpeechRecognition({ lang: "zh-CN", continuous: true, interimResults: true })
    )

    act(() => result.current.startListening())

    const rec = getRecognition()
    expect(rec.lang).toBe("zh-CN")
    expect(rec.continuous).toBe(true)
    expect(rec.interimResults).toBe(true)
  })

  it("stopListening stops recognition and prevents auto-restart", () => {
    mockSpeechRecognitionAPI()
    const { result } = renderHook(() => useSpeechRecognition())

    act(() => result.current.startListening())
    act(() => result.current.stopListening())

    expect(sharedStop).toHaveBeenCalled()
    expect(result.current.isListening).toBe(false)

    fireEnd()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(sharedStart).toHaveBeenCalledTimes(1)
  })

  it("fires onResult callback for final results", () => {
    mockSpeechRecognitionAPI()
    const onResult = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ onResult }))

    act(() => result.current.startListening())
    act(() => fireResult(["hello world"]))

    expect(onResult).toHaveBeenCalledWith("hello world")
  })

  it("fires onInterimResult for interim results", () => {
    mockSpeechRecognitionAPI()
    const onInterimResult = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ onInterimResult }))

    act(() => result.current.startListening())
    act(() => fireResult([], ["hello"]))

    expect(onInterimResult).toHaveBeenCalledWith("hello")
  })

  it("fires onError with correct type", () => {
    mockSpeechRecognitionAPI()
    const onError = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ onError }))

    act(() => result.current.startListening())
    act(() => fireError("not-allowed"))

    expect(onError).toHaveBeenCalledWith("not-allowed", expect.any(String))
  })

  it("auto-restarts on retryable error with exponential backoff", () => {
    mockSpeechRecognitionAPI()
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useSpeechRecognition({ onError, maxRestartAttempts: 3, restartDelay: 100 })
    )

    act(() => result.current.startListening())
    expect(sharedStart).toHaveBeenCalledTimes(1)

    act(() => fireError("no-speech"))

    expect(onError).toHaveBeenCalled()
    expect(result.current.isListening).toBe(false)

    act(() => { vi.advanceTimersByTime(100) })
    expect(sharedStart).toHaveBeenCalledTimes(2)
  })

  it("does not auto-restart on not-allowed error", () => {
    mockSpeechRecognitionAPI()
    const { result } = renderHook(() => useSpeechRecognition())

    act(() => result.current.startListening())
    act(() => fireError("not-allowed"))

    act(() => { vi.advanceTimersByTime(5000) })
    expect(sharedStart).toHaveBeenCalledTimes(1)
  })

  it("auto-restarts on onend", () => {
    mockSpeechRecognitionAPI()
    const { result } = renderHook(() => useSpeechRecognition())

    act(() => result.current.startListening())
    expect(sharedStart).toHaveBeenCalledTimes(1)

    act(() => fireEnd())

    act(() => { vi.advanceTimersByTime(1000) })
    expect(sharedStart).toHaveBeenCalledTimes(2)
  })

  it("respects maxRestartAttempts on error", () => {
    mockSpeechRecognitionAPI()
    const { result } = renderHook(() =>
      useSpeechRecognition({ maxRestartAttempts: 2, restartDelay: 100 })
    )

    act(() => result.current.startListening())
    expect(sharedStart).toHaveBeenCalledTimes(1)

    act(() => fireError("no-speech"))
    act(() => { vi.advanceTimersByTime(200) })
    expect(sharedStart).toHaveBeenCalledTimes(2)

    act(() => fireError("no-speech"))
    act(() => { vi.advanceTimersByTime(400) })
    expect(sharedStart).toHaveBeenCalledTimes(3)

    act(() => fireError("no-speech"))
    act(() => { vi.advanceTimersByTime(1600) })
    expect(sharedStart).toHaveBeenCalledTimes(3)
  })

  it("sets isSupported false when SpeechRecognition is not available", () => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
      configurable: true,
    })

    const { result } = renderHook(() => useSpeechRecognition())

    act(() => result.current.startListening())

    expect(result.current.isSupported).toBe(false)
    expect(result.current.error).toBe(
      "Speech recognition not supported. Please use Chrome."
    )
  })

  it("uses latest callback refs for onResult", () => {
    mockSpeechRecognitionAPI()
    const onResult1 = vi.fn()
    const onResult2 = vi.fn()

    const { rerender, result } = renderHook(
      ({ cb }) => useSpeechRecognition({ onResult: cb }),
      { initialProps: { cb: onResult1 } }
    )
    act(() => result.current.startListening())

    rerender({ cb: onResult2 })
    act(() => fireResult(["test"]))

    expect(onResult1).not.toHaveBeenCalled()
    expect(onResult2).toHaveBeenCalledWith("test")
  })

  it("updates error and errorType on error", () => {
    mockSpeechRecognitionAPI()
    const { result } = renderHook(() => useSpeechRecognition())

    act(() => result.current.startListening())
    act(() => fireError("network"))

    expect(result.current.error).toBeTruthy()
    expect(result.current.errorType).toBe("network")
  })
})
