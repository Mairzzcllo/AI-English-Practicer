// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { EmptyState } from "./EmptyState"

afterEach(() => cleanup())

describe("EmptyState", () => {
  it("renders message and button", () => {
    render(<EmptyState message="Nothing here" buttonLabel="Go back" onAction={() => {}} />)
    expect(screen.getByText("Nothing here")).toBeDefined()
    expect(screen.getByText("Go back")).toBeDefined()
  })

  it("calls onAction when button clicked", () => {
    const fn = vi.fn()
    render(<EmptyState message="Empty" buttonLabel="Click me" onAction={fn} />)
    fireEvent.click(screen.getByText("Click me"))
    expect(fn).toHaveBeenCalledOnce()
  })

  it("renders with glass class", () => {
    const { container } = render(<EmptyState message="test" buttonLabel="btn" onAction={() => {}} />)
    expect(container.querySelector(".glass")).not.toBeNull()
  })
})
