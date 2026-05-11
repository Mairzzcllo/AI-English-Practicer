// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { SessionCard } from "./SessionCard"

afterEach(() => cleanup())

const baseSession = {
  _id: "abc123",
  mode: "interview",
  industry: "tech",
  difficulty: "intermediate",
  createdAt: "2025-01-15T10:30:00Z",
}

describe("SessionCard", () => {
  it("renders industry for interview mode", () => {
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />)
    expect(screen.getByText("tech")).toBeDefined()
  })

  it("renders topic for conversation mode", () => {
    render(<SessionCard session={{ ...baseSession, mode: "conversation", topic: "travel" }} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />)
    expect(screen.getByText("travel")).toBeDefined()
  })

  it("renders Free Talk when no topic", () => {
    render(<SessionCard session={{ ...baseSession, mode: "conversation", topic: undefined }} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />)
    expect(screen.getByText("Free Talk")).toBeDefined()
  })

  it("renders mode badge", () => {
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />)
    expect(screen.getByText("interview")).toBeDefined()
  })

  it("renders difficulty", () => {
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />)
    expect(screen.getByText("intermediate")).toBeDefined()
  })

  it("renders formatted date", () => {
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />)
    expect(screen.getByText(/2025/)).toBeDefined()
  })

  it("renders score when summary exists", () => {
    render(
      <SessionCard
        session={{ ...baseSession, summary: { overallScore: 85.3 } }}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        deleting={null}
      />
    )
    expect(screen.getByText("85")).toBeDefined()
  })

  it("does not render score when summary missing", () => {
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />)
    expect(screen.queryByText("/100")).toBeNull()
  })

  it("calls onClick when card clicked", () => {
    const onClick = vi.fn()
    render(<SessionCard session={baseSession} onClick={onClick} onDelete={vi.fn()} deleting={null} />)
    fireEvent.click(screen.getByText("tech"))
    expect(onClick).toHaveBeenCalledWith("abc123")
  })

  it("calls onDelete when delete clicked", () => {
    const onDelete = vi.fn()
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={onDelete} deleting={null} />)
    const deleteBtn = screen.getByTitle("Delete")
    fireEvent.click(deleteBtn)
    expect(onDelete).toHaveBeenCalled()
  })

  it("disables delete button when deleting this id", () => {
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting="abc123" />)
    const deleteBtn = screen.getByTitle("Delete") as HTMLButtonElement
    expect(deleteBtn.disabled).toBe(true)
  })

  it("does not disable delete when deleting other id", () => {
    render(<SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting="other-id" />)
    const deleteBtn = screen.getByTitle("Delete") as HTMLButtonElement
    expect(deleteBtn.disabled).toBe(false)
  })

  it("renders with glass class", () => {
    const { container } = render(
      <SessionCard session={baseSession} onClick={vi.fn()} onDelete={vi.fn()} deleting={null} />
    )
    expect(container.querySelector(".glass")).not.toBeNull()
  })
})
