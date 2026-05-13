import { describe, it, expect } from "vitest"
import { enforceMinimalism } from "./minimalism"
import type { IntentResult, ResponseBudget } from "./types"

function result(overrides?: Partial<IntentResult>): IntentResult {
  return { intent: "continue_conversation", confidence: 0.6, ...overrides }
}

function budget(overrides?: Partial<ResponseBudget>): ResponseBudget {
  return { maxSentences: 4, explanationDepth: 0.8, ...overrides }
}

describe("enforceMinimalism", () => {
  it("allows explanation for ask_definition intent", () => {
    const b = enforceMinimalism(result({ intent: "ask_definition" }), budget())
    expect(b.explanationDepth).toBe(0.8)
  })

  it("allows explanation for ask_correction intent", () => {
    const b = enforceMinimalism(result({ intent: "ask_correction" }), budget())
    expect(b.explanationDepth).toBe(0.8)
  })

  it("zeroes explanationDepth for continue_conversation", () => {
    const b = enforceMinimalism(result({ intent: "continue_conversation" }), budget())
    expect(b.explanationDepth).toBe(0)
  })

  it("zeroes explanationDepth for small_talk", () => {
    const b = enforceMinimalism(result({ intent: "small_talk" }), budget())
    expect(b.explanationDepth).toBe(0)
  })

  it("zeroes explanationDepth for hesitation", () => {
    const b = enforceMinimalism(result({ intent: "hesitation" }), budget())
    expect(b.explanationDepth).toBe(0)
  })

  it("zeroes explanationDepth for confirmation", () => {
    const b = enforceMinimalism(result({ intent: "confirmation" }), budget())
    expect(b.explanationDepth).toBe(0)
  })

  it("zeroes explanationDepth for emotional_expression", () => {
    const b = enforceMinimalism(result({ intent: "emotional_expression" }), budget())
    expect(b.explanationDepth).toBe(0)
  })

  it("clamps maxSentences to 2 for low-confidence non-teaching intent", () => {
    const b = enforceMinimalism(result({ intent: "small_talk", confidence: 0.3 }), budget({ maxSentences: 5 }))
    expect(b.maxSentences).toBeLessThanOrEqual(2)
    expect(b.explanationDepth).toBe(0)
  })

  it("does not clamp maxSentences for low-confidence ask_definition", () => {
    const b = enforceMinimalism(result({ intent: "ask_definition", confidence: 0.3 }), budget({ maxSentences: 4 }))
    expect(b.maxSentences).toBe(4)
  })

  it("clamps maxSentences to 2 for short non-teaching input", () => {
    const b = enforceMinimalism(result({ intent: "small_talk" }), budget({ maxSentences: 5 }), "hi")
    expect(b.maxSentences).toBeLessThanOrEqual(2)
    expect(b.explanationDepth).toBe(0)
  })

  it("does not clamp maxSentences for short ask_definition input", () => {
    const b = enforceMinimalism(result({ intent: "ask_definition" }), budget({ maxSentences: 4 }), "hi")
    expect(b.maxSentences).toBe(4)
  })

  it("does not modify budget for ask_definition with high confidence and long input", () => {
    const input = "what does the term asynchronous programming mean in javascript"
    const b = enforceMinimalism(result({ intent: "ask_definition", confidence: 0.9 }), budget({ maxSentences: 4, explanationDepth: 0.8 }), input)
    expect(b.maxSentences).toBe(4)
    expect(b.explanationDepth).toBe(0.8)
  })

  it("clamps maxSentences to minimum 1", () => {
    const b = enforceMinimalism(result({ intent: "confirmation" }), budget({ maxSentences: 0 }))
    expect(b.maxSentences).toBeGreaterThanOrEqual(1)
  })

  it("preserves maxSentences for high-confidence teaching intents", () => {
    const b = enforceMinimalism(result({ intent: "ask_definition", confidence: 0.9 }), budget({ maxSentences: 5, explanationDepth: 0.8 }))
    expect(b.maxSentences).toBe(5)
    expect(b.explanationDepth).toBe(0.8)
  })
})
