// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useMicPermission } from "./useMicPermission"

afterEach(() => { vi.restoreAllMocks() })

describe("useMicPermission", () => {
  it("returns null initially then resolves to granted", () => {
    const addEventListener = vi.fn()
    const query = vi.fn().mockResolvedValue({ state: "granted", addEventListener })
    Object.defineProperty(navigator, "permissions", {
      value: { query },
      configurable: true,
    })

    const { result } = renderHook(() => useMicPermission())
    expect(result.current).toBeNull()
  })
})
