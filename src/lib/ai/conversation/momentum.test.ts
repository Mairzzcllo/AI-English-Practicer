import { describe, it, expect } from "vitest"
import { createDefaultMomentumState, updateMomentumFromIntent, momentumToPrompt } from "./momentum"
import type { IntentResult } from "./types"

function intent(overrides?: Partial<IntentResult>): IntentResult {
  return { intent: "continue_conversation", confidence: 0.6, ...overrides }
}

describe("createDefaultMomentumState", () => {
  it("creates state with default values", () => {
    const m = createDefaultMomentumState()
    expect(m.momentum).toBe(0.5)
    expect(m.depth).toBe(0)
    expect(m.responsiveness).toBe(0.5)
  })
})

describe("updateMomentumFromIntent", () => {
  it("increases momentum for ask_definition", () => {
    const current = createDefaultMomentumState()
    const next = updateMomentumFromIntent(current, intent({ intent: "ask_definition", confidence: 0.9 }), "what does X mean")
    expect(next.momentum).toBeGreaterThan(current.momentum)
    expect(next.depth).toBeGreaterThan(current.depth)
    expect(next.responsiveness).toBeGreaterThan(current.responsiveness)
  })

  it("decreases momentum for hesitation", () => {
    const current = { momentum: 0.5, depth: 0.3, responsiveness: 0.5 }
    const next = updateMomentumFromIntent(current, intent({ intent: "hesitation", confidence: 0.3 }), "um")
    expect(next.momentum).toBeLessThan(current.momentum)
    expect(next.depth).toBeLessThan(current.depth)
  })

  it("decreases responsiveness for short input", () => {
    const current = createDefaultMomentumState()
    const next = updateMomentumFromIntent(current, intent({ intent: "continue_conversation", confidence: 0.6 }), "ok")
    expect(next.responsiveness).toBeLessThan(current.responsiveness)
  })

  it("applies extra penalty for low confidence", () => {
    const current = createDefaultMomentumState()
    const lowConf = updateMomentumFromIntent(current, intent({ intent: "continue_conversation", confidence: 0.2 }), "hello world")
    const highConf = updateMomentumFromIntent(current, intent({ intent: "continue_conversation", confidence: 0.9 }), "hello world")
    expect(lowConf.momentum).toBeLessThanOrEqual(highConf.momentum)
  })

  it("clamps momentum to [0, 1]", () => {
    const high = updateMomentumFromIntent(
      { momentum: 0.95, depth: 0.5, responsiveness: 0.9 },
      intent({ intent: "ask_definition", confidence: 0.9 }),
      "what does X mean",
    )
    expect(high.momentum).toBeLessThanOrEqual(1)
    expect(high.momentum).toBeGreaterThanOrEqual(0)

    const low = updateMomentumFromIntent(
      { momentum: 0.1, depth: 0.5, responsiveness: 0.1 },
      intent({ intent: "hesitation", confidence: 0.2 }),
      "um",
    )
    expect(low.momentum).toBeGreaterThanOrEqual(0)
    expect(low.momentum).toBeLessThanOrEqual(1)
  })

  it("clamps depth to [0, 1]", () => {
    const high = updateMomentumFromIntent(
      { momentum: 0.5, depth: 0.9, responsiveness: 0.5 },
      intent({ intent: "ask_definition", confidence: 0.9 }),
      "what does X mean",
    )
    expect(high.depth).toBeLessThanOrEqual(1)

    const low = updateMomentumFromIntent(
      { momentum: 0.5, depth: 0.1, responsiveness: 0.5 },
      intent({ intent: "small_talk", confidence: 0.6 }),
      "hello",
    )
    expect(low.depth).toBeGreaterThanOrEqual(0)
  })

  it("clamps responsiveness to [0, 1]", () => {
    const high = updateMomentumFromIntent(
      { momentum: 0.5, depth: 0.5, responsiveness: 0.95 },
      intent({ intent: "ask_definition", confidence: 0.9 }),
      "what does X mean",
    )
    expect(high.responsiveness).toBeLessThanOrEqual(1)
  })

  it("increases depth for ask_definition", () => {
    const current = createDefaultMomentumState()
    const next = updateMomentumFromIntent(current, intent({ intent: "ask_definition" }), "what does X mean")
    expect(next.depth).toBeGreaterThanOrEqual(0.1)
  })

  it("decreases depth for small_talk", () => {
    const current = { momentum: 0.5, depth: 0.5, responsiveness: 0.5 }
    const next = updateMomentumFromIntent(current, intent({ intent: "small_talk" }), "how are you")
    expect(next.depth).toBeLessThan(current.depth)
  })

  it("increases responsiveness for emotional_expression", () => {
    const current = createDefaultMomentumState()
    const next = updateMomentumFromIntent(current, intent({ intent: "emotional_expression", confidence: 0.8 }), "I feel great")
    expect(next.responsiveness).toBeGreaterThan(current.responsiveness)
  })

  it("handles unknown intent as continue_conversation", () => {
    const current = createDefaultMomentumState()
    const unknown = { intent: "unknown_intent_type" as unknown as IntentResult["intent"], confidence: 0.6 }
    const next = updateMomentumFromIntent(current, unknown, "something random")
    expect(next.momentum).toBeGreaterThanOrEqual(0)
    expect(next.momentum).toBeLessThanOrEqual(1)
    expect(next.depth).toBeGreaterThanOrEqual(0)
    expect(next.responsiveness).toBeGreaterThanOrEqual(0)
  })
})

describe("momentumToPrompt", () => {
  it("returns shallow topic hint for default state (depth=0)", () => {
    const prompt = momentumToPrompt(createDefaultMomentumState())
    expect(prompt).toContain("probing deeper")
  })

  it("returns high momentum hint when momentum > 0.7", () => {
    const prompt = momentumToPrompt({ momentum: 0.8, depth: 0.3, responsiveness: 0.6 })
    expect(prompt).toContain("momentum")
    expect(prompt).toContain("keep the flow")
  })

  it("returns low momentum hint when momentum < 0.3", () => {
    const prompt = momentumToPrompt({ momentum: 0.2, depth: 0.1, responsiveness: 0.3 })
    expect(prompt).toContain("re-engage")
  })

  it("returns depth hint when depth > 0.6", () => {
    const prompt = momentumToPrompt({ momentum: 0.6, depth: 0.7, responsiveness: 0.5 })
    expect(prompt).toContain("depth")
    expect(prompt).toContain("detail")
  })

  it("returns shallow topic hint when depth < 0.2 and momentum > 0.4", () => {
    const prompt = momentumToPrompt({ momentum: 0.5, depth: 0.1, responsiveness: 0.5 })
    expect(prompt).toContain("probing deeper")
  })

  it("returns responsiveness hint when responsiveness > 0.7", () => {
    const prompt = momentumToPrompt({ momentum: 0.5, depth: 0.3, responsiveness: 0.8 })
    expect(prompt).toContain("responsive")
  })

  it("returns low responsiveness hint when responsiveness < 0.3", () => {
    const prompt = momentumToPrompt({ momentum: 0.5, depth: 0.3, responsiveness: 0.2 })
    expect(prompt).toContain("engaging questions")
  })

  it("prefixes with 'Conversation momentum:' when hints present", () => {
    const prompt = momentumToPrompt({ momentum: 0.8, depth: 0.7, responsiveness: 0.8 })
    expect(prompt).toMatch(/^Conversation momentum:/)
  })
})
