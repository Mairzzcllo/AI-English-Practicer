// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useSessionList } from "./useSessionList"

const mockSessions = [
  { _id: "1", mode: "interview", industry: "tech", difficulty: "intermediate", createdAt: "2025-01-01" },
]

afterEach(() => { vi.restoreAllMocks() })
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ sessions: mockSessions }),
  } as Response)
})

describe("useSessionList", () => {
  it("fetches sessions on mount", async () => {
    const { result } = renderHook(() => useSessionList())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual(mockSessions)
  })

  it("handleDelete removes session and calls API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response)
    window.confirm = vi.fn().mockReturnValue(true)

    const { result } = renderHook(() => useSessionList())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleDelete("1", { stopPropagation: vi.fn() } as unknown as React.MouseEvent)
    })
    expect(result.current.sessions).toEqual([])
  })
})
