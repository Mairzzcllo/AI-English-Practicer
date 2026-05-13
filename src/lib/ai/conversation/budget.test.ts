import { describe, it, expect } from "vitest"
import { deriveBudget, budgetToPrompt } from "./budget"
import type { IntentResult } from "./types"

function result(overrides?: Partial<IntentResult>): IntentResult {
  return { intent: "continue_conversation", confidence: 0.6, ...overrides }
}

describe("deriveBudget", () => {
  it("returns low budget for continue_conversation", () => {
    const b = deriveBudget(result({ intent: "continue_conversation" }))
    expect(b.maxSentences).toBeLessThanOrEqual(2)
    expect(b.explanationDepth).toBe(0)
  })

  it("returns high budget for ask_definition", () => {
    const b = deriveBudget(result({ intent: "ask_definition" }))
    expect(b.maxSentences).toBeGreaterThanOrEqual(3)
    expect(b.explanationDepth).toBeGreaterThanOrEqual(0.5)
  })

  it("returns medium budget for ask_correction", () => {
    const b = deriveBudget(result({ intent: "ask_correction" }))
    expect(b.maxSentences).toBeGreaterThanOrEqual(2)
    expect(b.explanationDepth).toBeGreaterThan(0)
    expect(b.explanationDepth).toBeLessThanOrEqual(0.7)
  })

  it("returns conversational budget for small_talk", () => {
    const b = deriveBudget(result({ intent: "small_talk" }))
    expect(b.maxSentences).toBeGreaterThanOrEqual(1)
    expect(b.explanationDepth).toBeLessThanOrEqual(0.2)
  })

  it("returns low budget for hesitation", () => {
    const b = deriveBudget(result({ intent: "hesitation" }))
    expect(b.maxSentences).toBeLessThanOrEqual(2)
    expect(b.explanationDepth).toBe(0)
  })

  it("returns minimal budget for confirmation", () => {
    const b = deriveBudget(result({ intent: "confirmation" }))
    expect(b.maxSentences).toBe(1)
    expect(b.explanationDepth).toBe(0)
  })

  it("returns moderate budget for emotional_expression", () => {
    const b = deriveBudget(result({ intent: "emotional_expression" }))
    expect(b.maxSentences).toBeGreaterThanOrEqual(1)
    expect(b.explanationDepth).toBeLessThanOrEqual(0.2)
  })

  it("clamps short input to max 2 sentences", () => {
    const b = deriveBudget(result({ intent: "ask_definition" }), "hi")
    expect(b.maxSentences).toBeLessThanOrEqual(2)
    expect(b.explanationDepth).toBe(0)
  })

  it("keeps normal budget for long input", () => {
    const b = deriveBudget(result({ intent: "ask_definition" }), "what does the term 'asynchronous programming' mean in JavaScript")
    expect(b.maxSentences).toBeGreaterThanOrEqual(3)
  })

  it("modulates maxSentences upward with high engagement", () => {
    const normal = deriveBudget(result({ intent: "small_talk" }), "hello how are you today")
    const engaged = deriveBudget(result({ intent: "small_talk" }), "hello how are you today", { engagement: 0.9 })
    expect(engaged.maxSentences).toBeGreaterThanOrEqual(normal.maxSentences)
  })

  it("modulates maxSentences upward with high verbosity", () => {
    const normal = deriveBudget(result({ intent: "small_talk" }), "hello how are you today")
    const verbose = deriveBudget(result({ intent: "small_talk" }), "hello how are you today", { verbosity: 0.9 })
    expect(verbose.maxSentences).toBeGreaterThanOrEqual(normal.maxSentences)
  })

  it("clamps maxSentences to 2 with low verbosity", () => {
    const b = deriveBudget(result({ intent: "ask_definition" }), "what is a closure in JavaScript", { verbosity: 0.1 })
    expect(b.maxSentences).toBeLessThanOrEqual(2)
  })

  it("clamps maxSentences to minimum 1", () => {
    const b = deriveBudget(result({ intent: "confirmation" }), "", { verbosity: 0.1 })
    expect(b.maxSentences).toBeGreaterThanOrEqual(1)
  })

  it("clamps explanationDepth to [0, 1]", () => {
    const b = deriveBudget(result({ intent: "ask_definition" }), "explain everything", { engagement: 0.9, verbosity: 0.9 })
    expect(b.explanationDepth).toBeGreaterThanOrEqual(0)
    expect(b.explanationDepth).toBeLessThanOrEqual(1)
  })
})

describe("budgetToPrompt", () => {
  it("generates constraint text for moderate budget", () => {
    const text = budgetToPrompt({ maxSentences: 3, explanationDepth: 0.5 })
    expect(text).toContain("3 sentences")
    expect(text).toContain("moderate")
  })

  it("indicates no explanation when depth is 0", () => {
    const text = budgetToPrompt({ maxSentences: 1, explanationDepth: 0 })
    expect(text).toContain("Do not explain")
  })

  it("indicates full explanation when depth is 1", () => {
    const text = budgetToPrompt({ maxSentences: 4, explanationDepth: 1 })
    expect(text).toContain("full in-depth explanation")
  })

  it("indicates brief explanation when depth is low", () => {
    const text = budgetToPrompt({ maxSentences: 2, explanationDepth: 0.2 })
    expect(text).toContain("brief")
  })

  it("handles exact boundary values", () => {
    const zero = budgetToPrompt({ maxSentences: 1, explanationDepth: 0 })
    expect(zero).toContain("Do not explain")
    const high = budgetToPrompt({ maxSentences: 5, explanationDepth: 0.9 })
    expect(high).toContain("5 sentences")
  })
})
