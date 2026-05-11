// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSilenceDetection } from "./useSilenceDetection"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useSilenceDetection", () => {
  it("calls onSilence after threshold ms of inactivity", () => {
    const onSilence = vi.fn()
    renderHook(() => useSilenceDetection({ threshold: 3000, pollingInterval: 100, onSilence }))

    expect(onSilence).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(3500) })

    expect(onSilence).toHaveBeenCalledTimes(1)
  })

  it("reportActivity resets the silence timer", () => {
    const onSilence = vi.fn()
    const { result } = renderHook(() =>
      useSilenceDetection({ threshold: 2000, pollingInterval: 100, onSilence })
    )

    act(() => { vi.advanceTimersByTime(1500) })
    expect(onSilence).not.toHaveBeenCalled()

    act(() => result.current.reportActivity())

    act(() => { vi.advanceTimersByTime(1500) })
    expect(onSilence).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(1000) })
    expect(onSilence).toHaveBeenCalledTimes(1)
  })

  it("fires onSilence only once when staying silent", () => {
    const onSilence = vi.fn()
    renderHook(() => useSilenceDetection({ threshold: 1000, pollingInterval: 50, onSilence }))

    act(() => { vi.advanceTimersByTime(5000) })

    expect(onSilence).toHaveBeenCalledTimes(1)
  })

  it("fires onSilence again after new activity and silence", () => {
    const onSilence = vi.fn()
    const { result } = renderHook(() =>
      useSilenceDetection({ threshold: 1000, pollingInterval: 50, onSilence })
    )

    act(() => { vi.advanceTimersByTime(5000) })
    expect(onSilence).toHaveBeenCalledTimes(1)

    act(() => result.current.reportActivity())
    act(() => { vi.advanceTimersByTime(500) })
    expect(onSilence).toHaveBeenCalledTimes(1)

    act(() => { vi.advanceTimersByTime(2000) })
    expect(onSilence).toHaveBeenCalledTimes(2)
  })

  it("destroy stops further onSilence calls", () => {
    const onSilence = vi.fn()
    const { result } = renderHook(() =>
      useSilenceDetection({ threshold: 1000, pollingInterval: 50, onSilence })
    )

    act(() => { vi.advanceTimersByTime(1500) })
    expect(onSilence).toHaveBeenCalledTimes(1)

    act(() => result.current.destroy())

    act(() => { vi.advanceTimersByTime(5000) })
    expect(onSilence).toHaveBeenCalledTimes(1)
  })

  it("reset clears the timer and resets state", () => {
    const onSilence = vi.fn()
    const { result } = renderHook(() =>
      useSilenceDetection({ threshold: 1000, pollingInterval: 50, onSilence })
    )

    act(() => { vi.advanceTimersByTime(1500) })
    expect(onSilence).toHaveBeenCalledTimes(1)

    act(() => result.current.reset())
    expect(result.current.isSilent).toBe(false)

    act(() => { vi.advanceTimersByTime(500) })
    expect(onSilence).toHaveBeenCalledTimes(1)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(onSilence).toHaveBeenCalledTimes(2)
  })

  it("reports isSilent correctly", () => {
    const { result } = renderHook(() =>
      useSilenceDetection({ threshold: 2000, pollingInterval: 100 })
    )

    expect(result.current.isSilent).toBe(false)

    act(() => { vi.advanceTimersByTime(2500) })
    expect(result.current.isSilent).toBe(true)

    act(() => result.current.reportActivity())
    expect(result.current.isSilent).toBe(false)
  })

  it("updates onSilence callback when options change", () => {
    const onSilence1 = vi.fn()
    const onSilence2 = vi.fn()
    const { rerender, result } = renderHook(
      ({ cb }) => useSilenceDetection({ threshold: 1000, pollingInterval: 50, onSilence: cb }),
      { initialProps: { cb: onSilence1 } }
    )

    act(() => { vi.advanceTimersByTime(1500) })
    expect(onSilence1).toHaveBeenCalledTimes(1)
    expect(onSilence2).not.toHaveBeenCalled()

    act(() => result.current.reportActivity())

    rerender({ cb: onSilence2 })

    act(() => { vi.advanceTimersByTime(1500) })
    expect(onSilence1).toHaveBeenCalledTimes(1)
    expect(onSilence2).toHaveBeenCalledTimes(1)
  })
})
