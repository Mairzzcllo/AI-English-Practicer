// @vitest-environment jsdom

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ScoreCircle } from "./ScoreCircle"

describe("ScoreCircle", () => {
  it("renders rounded score", () => {
    render(<ScoreCircle score={85.6} />)
    expect(screen.getByText("86")).toBeDefined()
    expect(screen.getByText("/100")).toBeDefined()
  })

  it("renders 0 when score is 0", () => {
    render(<ScoreCircle score={0} />)
    expect(screen.getByText("0")).toBeDefined()
  })

  it("renders large size by default", () => {
    render(<ScoreCircle score={90} />)
    const el = screen.getByText("90")
    expect(el.className).toContain("text-3xl")
  })

  it("renders small size when specified", () => {
    render(<ScoreCircle score={75} size="sm" />)
    const el = screen.getByText("75")
    expect(el.className).toContain("text-xl")
  })
})
