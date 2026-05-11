// @vitest-environment jsdom

import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { LoadingSkeleton } from "./LoadingSkeleton"

afterEach(() => cleanup())

describe("LoadingSkeleton", () => {
  it("renders default 3 items", () => {
    const { container } = render(<LoadingSkeleton />)
    const items = container.querySelectorAll(".animate-pulse")
    expect(items).toHaveLength(3)
  })

  it("renders custom count", () => {
    const { container } = render(<LoadingSkeleton count={5} />)
    const items = container.querySelectorAll(".animate-pulse")
    expect(items).toHaveLength(5)
  })

  it("renders with glass class", () => {
    const { container } = render(<LoadingSkeleton count={1} />)
    expect(container.querySelector(".animate-pulse")?.className).toContain("glass")
  })
})
