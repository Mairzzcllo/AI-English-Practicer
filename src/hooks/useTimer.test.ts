// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTimer } from "./useTimer"

afterEach(() => { vi.useRealTimers() })
beforeEach(() => { vi.useFakeTimers() })

describe("useTimer", () => {
  it("starts with given initial time", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 90, active: false }))
    expect(result.current.timeLeft).toBe(90)
  })

  it("counts down when active", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 5, active: true }))
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.timeLeft).toBe(4)
  })

  it("calls onExpire when reaching 0", () => {
    const onExpire = vi.fn()
    renderHook(() => useTimer({ initialSeconds: 1, active: true, onExpire }))
    act(() => vi.advanceTimersByTime(1000))
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it("does not count down when not active", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 5, active: false }))
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.timeLeft).toBe(5)
  })

  it("formatTime returns MM:SS format", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 125, active: false }))
    expect(result.current.formatTime(125)).toBe("02:05")
    expect(result.current.formatTime(0)).toBe("00:00")
    expect(result.current.formatTime(59)).toBe("00:59")
  })
})
