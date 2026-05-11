// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { EndedScreen } from "./EndedScreen"

afterEach(() => cleanup())

const defaultProps = {
  mode: "interview" as const,
  summary: null,
  onBackHome: vi.fn(),
  onViewHistory: vi.fn(),
}

const sampleSummary = {
  overallScore: 85,
  summary: "Great job!",
  duration: 120,
  totalMessages: 8,
  strengths: ["Clear pronunciation"],
  improvements: ["Use more vocabulary"],
}

describe("EndedScreen", () => {
  it("renders interview complete title", () => {
    render(<EndedScreen {...defaultProps} />)
    expect(screen.getByText("Interview Complete")).toBeDefined()
  })

  it("renders conversation complete title", () => {
    render(<EndedScreen {...defaultProps} mode="conversation" />)
    expect(screen.getByText("Conversation Complete")).toBeDefined()
  })

  it("renders ScoreCircle with score", () => {
    render(<EndedScreen {...defaultProps} summary={sampleSummary} />)
    expect(screen.getByText("85")).toBeDefined()
    expect(screen.getByText("/100")).toBeDefined()
  })

  it("renders summary text", () => {
    render(<EndedScreen {...defaultProps} summary={sampleSummary} />)
    expect(screen.getByText("Great job!")).toBeDefined()
  })

  it("renders duration and messages stats", () => {
    render(<EndedScreen {...defaultProps} summary={sampleSummary} />)
    expect(screen.getByText("120s")).toBeDefined()
    expect(screen.getByText("8")).toBeDefined()
  })

  it("renders StrengthsImprovements", () => {
    render(<EndedScreen {...defaultProps} summary={sampleSummary} />)
    expect(screen.getByText(/Clear pronunciation/)).toBeDefined()
    expect(screen.getByText(/Use more vocabulary/)).toBeDefined()
  })

  it("calls onBackHome when button clicked", () => {
    const onBackHome = vi.fn()
    render(<EndedScreen {...defaultProps} onBackHome={onBackHome} />)
    fireEvent.click(screen.getByText("Back to Home"))
    expect(onBackHome).toHaveBeenCalledOnce()
  })

  it("calls onViewHistory when button clicked", () => {
    const onViewHistory = vi.fn()
    render(<EndedScreen {...defaultProps} onViewHistory={onViewHistory} />)
    fireEvent.click(screen.getByText("View History"))
    expect(onViewHistory).toHaveBeenCalledOnce()
  })

  it("shows 0 score when summary is null", () => {
    render(<EndedScreen {...defaultProps} />)
    const circles = screen.getAllByText("0")
    expect(circles.length).toBeGreaterThanOrEqual(1)
  })

  it("shows 0 duration when summary is null", () => {
    render(<EndedScreen {...defaultProps} />)
    expect(screen.getByText("0s")).toBeDefined()
  })
})
