// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useSessionDetail } from "./useSessionDetail"

const mockSession = {
  _id: "1",
  mode: "interview",
  messages: [],
  summary: { overallScore: 85, strengths: [], improvements: [] },
}

afterEach(() => { vi.restoreAllMocks() })
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ session: mockSession }),
  } as Response)
})

describe("useSessionDetail", () => {
  it("fetches session by id on mount", async () => {
    const { result } = renderHook(() => useSessionDetail("1"))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual(mockSession)
  })

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useSessionDetail(""))
    expect(result.current.loading).toBe(false)
    expect(result.current.session).toBeNull()
  })
})
