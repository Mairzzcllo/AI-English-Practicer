// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { EmptyHistory } from "./EmptyHistory"

afterEach(() => cleanup())

describe("EmptyHistory", () => {
  it("renders default message", () => {
    render(<EmptyHistory onAction={vi.fn()} />)
    expect(screen.getByText("No interviews yet.")).toBeDefined()
  })

  it("renders custom message", () => {
    render(<EmptyHistory onAction={vi.fn()} message="Nothing here" />)
    expect(screen.getByText("Nothing here")).toBeDefined()
  })

  it("renders default button label", () => {
    render(<EmptyHistory onAction={vi.fn()} />)
    expect(screen.getByText("Start your first interview")).toBeDefined()
  })

  it("renders custom button label", () => {
    render(<EmptyHistory onAction={vi.fn()} buttonLabel="Go back" />)
    expect(screen.getByText("Go back")).toBeDefined()
  })

  it("calls onAction when button clicked", () => {
    const fn = vi.fn()
    render(<EmptyHistory onAction={fn} />)
    fireEvent.click(screen.getByText("Start your first interview"))
    expect(fn).toHaveBeenCalledOnce()
  })

  it("renders with glass class", () => {
    const { container } = render(<EmptyHistory onAction={vi.fn()} />)
    expect(container.querySelector(".glass")).not.toBeNull()
  })
})
