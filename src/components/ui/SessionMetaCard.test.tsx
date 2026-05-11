// @vitest-environment jsdom

import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { SessionMetaCard } from "./SessionMetaCard"

afterEach(() => cleanup())

const baseSession = {
  _id: "abc",
  mode: "interview" as const,
  industry: "tech" as const,
  difficulty: "intermediate" as const,
  messages: [{ role: "ai" as const, content: "Hello", createdAt: new Date() }],
  createdAt: new Date("2025-06-15"),
  updatedAt: new Date("2025-06-15"),
  status: "completed" as const,
}

describe("SessionMetaCard", () => {
  it("renders ScoreCircle with correct score", () => {
    render(<SessionMetaCard session={baseSession} avgScore={75.3} />)
    expect(screen.getByText("75")).toBeDefined()
  })

  it("renders mode", () => {
    render(<SessionMetaCard session={baseSession} avgScore={85} />)
    expect(screen.getByText("interview")).toBeDefined()
  })

  it("renders industry when present", () => {
    render(<SessionMetaCard session={baseSession} avgScore={85} />)
    expect(screen.getByText("tech")).toBeDefined()
  })

  it("renders difficulty", () => {
    render(<SessionMetaCard session={baseSession} avgScore={85} />)
    expect(screen.getByText("intermediate")).toBeDefined()
  })

  it("renders message count", () => {
    render(<SessionMetaCard session={baseSession} avgScore={85} />)
    expect(screen.getByText("1")).toBeDefined()
  })

  it("renders topic when present", () => {
    const convSession = { ...baseSession, mode: "conversation" as const, topic: "food" as const }
    render(<SessionMetaCard session={convSession} avgScore={85} />)
    expect(screen.getByText("food")).toBeDefined()
  })

  it("renders with glass class", () => {
    const { container } = render(<SessionMetaCard session={baseSession} avgScore={85} />)
    expect(container.querySelector(".glass")).not.toBeNull()
  })
})
