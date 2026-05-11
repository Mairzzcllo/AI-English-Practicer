// @vitest-environment jsdom

import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { StrengthsImprovements } from "./StrengthsImprovements"

afterEach(() => cleanup())

describe("StrengthsImprovements", () => {
  it("renders strengths with checkmarks", () => {
    render(<StrengthsImprovements strengths={["Good grammar", "Clear voice"]} improvements={[]} />)
    expect(screen.getByText("Strengths")).toBeDefined()
    expect(screen.getByText("✓ Good grammar")).toBeDefined()
    expect(screen.getByText("✓ Clear voice")).toBeDefined()
  })

  it("renders improvements with arrows", () => {
    render(<StrengthsImprovements strengths={[]} improvements={["Use more idioms", "Speak slower"]} />)
    expect(screen.getByText("Areas to Improve")).toBeDefined()
    expect(screen.getByText("↑ Use more idioms")).toBeDefined()
    expect(screen.getByText("↑ Speak slower")).toBeDefined()
  })

  it("renders both columns when both provided", () => {
    render(<StrengthsImprovements strengths={["A"]} improvements={["B"]} />)
    expect(screen.getByText("Strengths")).toBeDefined()
    expect(screen.getByText("Areas to Improve")).toBeDefined()
    expect(screen.getByText("✓ A")).toBeDefined()
    expect(screen.getByText("↑ B")).toBeDefined()
  })

  it("renders nothing when both arrays are empty", () => {
    const { container } = render(<StrengthsImprovements strengths={[]} improvements={[]} />)
    expect(container.innerHTML).toBe("")
  })
})
