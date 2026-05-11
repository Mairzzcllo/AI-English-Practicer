// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { NotFoundState } from "./NotFoundState"

afterEach(() => cleanup())

describe("NotFoundState", () => {
  it("renders not found message", () => {
    render(<NotFoundState onBack={vi.fn()} />)
    expect(screen.getByText("Session not found.")).toBeDefined()
  })

  it("renders back button", () => {
    render(<NotFoundState onBack={vi.fn()} />)
    expect(screen.getByText("Back to history")).toBeDefined()
  })

  it("calls onBack when button clicked", () => {
    const fn = vi.fn()
    render(<NotFoundState onBack={fn} />)
    fireEvent.click(screen.getByText("Back to history"))
    expect(fn).toHaveBeenCalledOnce()
  })

  it("renders with glass class", () => {
    const { container } = render(<NotFoundState onBack={vi.fn()} />)
    expect(container.querySelector(".glass")).not.toBeNull()
  })
})
