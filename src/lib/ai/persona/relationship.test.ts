import { describe, it, expect } from "vitest"
import type { RelationshipState } from "./types"
import {
  applyRelationshipDelta,
  processRelationshipSignal,
  applyRelationshipDecay,
  getRelationshipQuality,
  isEstablished,
} from "./relationship"

function baseRel(overrides?: Partial<RelationshipState>): RelationshipState {
  return {
    familiarity: 0,
    trust: 0,
    comfort: 0,
    humorAcceptance: 0,
    ...overrides,
  }
}

describe("applyRelationshipDelta", () => {
  it("adds positive delta to a field", () => {
    const result = applyRelationshipDelta(baseRel(), "familiarity", 0.3)
    expect(result.familiarity).toBeCloseTo(0.3)
  })

  it("subtracts delta from a field", () => {
    const result = applyRelationshipDelta(baseRel({ trust: 0.5 }), "trust", -0.2)
    expect(result.trust).toBeCloseTo(0.3)
  })

  it("clamps to [0, 1]", () => {
    const over = applyRelationshipDelta(baseRel({ familiarity: 0.9 }), "familiarity", 0.2)
    expect(over.familiarity).toBe(1)
    const under = applyRelationshipDelta(baseRel({ comfort: 0.1 }), "comfort", -0.2)
    expect(under.comfort).toBe(0)
  })

  it("does not mutate original state", () => {
    const original = baseRel({ familiarity: 0.3 })
    const result = applyRelationshipDelta(original, "familiarity", 0.1)
    expect(original.familiarity).toBe(0.3)
    expect(result).not.toBe(original)
  })

  it("handles humorAcceptance delta", () => {
    const result = applyRelationshipDelta(baseRel({ humorAcceptance: 0.5 }), "humorAcceptance", 0.2)
    expect(result.humorAcceptance).toBeCloseTo(0.7)
  })
})

describe("processRelationshipSignal", () => {
  it("increases familiarity and comfort on positive_sentiment", () => {
    const result = processRelationshipSignal(baseRel(), { type: "positive_sentiment", intensity: 1 })
    expect(result.familiarity).toBeGreaterThan(0)
    expect(result.comfort).toBeGreaterThan(0)
    expect(result.trust).toBeGreaterThan(0)
  })

  it("decreases trust and comfort on negative_sentiment", () => {
    const result = processRelationshipSignal(baseRel({ trust: 0.4, comfort: 0.4 }), { type: "negative_sentiment", intensity: 1 })
    expect(result.trust).toBeLessThan(0.4)
    expect(result.comfort).toBeLessThan(0.4)
  })

  it("scales effect by intensity", () => {
    const low = processRelationshipSignal(baseRel(), { type: "positive_sentiment", intensity: 0.2 })
    const high = processRelationshipSignal(baseRel(), { type: "positive_sentiment", intensity: 1 })
    expect(low.familiarity).toBeLessThan(high.familiarity)
  })

  it("increases familiarity on long_reply", () => {
    const result = processRelationshipSignal(baseRel(), { type: "long_reply", intensity: 0.8 })
    expect(result.familiarity).toBeGreaterThan(0)
  })

  it("decreases comfort on interruption", () => {
    const result = processRelationshipSignal(baseRel({ comfort: 0.5 }), { type: "interruption", intensity: 0.6 })
    expect(result.comfort).toBeLessThan(0.5)
  })

  it("does not mutate original state", () => {
    const original = baseRel({ familiarity: 0.3 })
    processRelationshipSignal(original, { type: "positive_sentiment", intensity: 0.5 })
    expect(original.familiarity).toBe(0.3)
  })
})

describe("applyRelationshipDecay", () => {
  it("reduces all fields slightly over time", () => {
    const result = applyRelationshipDecay(baseRel({ familiarity: 0.8, trust: 0.7, comfort: 0.6, humorAcceptance: 0.5 }), 60)
    expect(result.familiarity).toBeLessThan(0.8)
    expect(result.trust).toBeLessThan(0.7)
    expect(result.comfort).toBeLessThan(0.6)
    expect(result.humorAcceptance).toBeLessThan(0.5)
  })

  it("does not go below zero", () => {
    const result = applyRelationshipDecay(baseRel(), 1000)
    expect(result.familiarity).toBe(0)
    expect(result.trust).toBe(0)
  })
})

describe("getRelationshipQuality", () => {
  it("returns 0 for default relationship", () => {
    expect(getRelationshipQuality(baseRel())).toBe(0)
  })

  it("returns average of all 4 fields when equal", () => {
    const rel = baseRel({ familiarity: 0.5, trust: 0.5, comfort: 0.5, humorAcceptance: 0.5 })
    expect(getRelationshipQuality(rel)).toBeCloseTo(0.5)
  })

  it("returns weighted average", () => {
    const rel = baseRel({ familiarity: 1, trust: 0.5, comfort: 0.5, humorAcceptance: 0 })
    expect(getRelationshipQuality(rel)).toBeCloseTo(0.525)
  })
})

describe("isEstablished", () => {
  it("returns false for zero relationship", () => {
    expect(isEstablished(baseRel())).toBe(false)
  })

  it("returns true when quality exceeds threshold", () => {
    expect(isEstablished(baseRel({ familiarity: 0.4, trust: 0.3, comfort: 0.3, humorAcceptance: 0.2 }))).toBe(true)
  })

  it("returns false when quality is below threshold", () => {
    expect(isEstablished(baseRel({ familiarity: 0.1, trust: 0.1, comfort: 0.1, humorAcceptance: 0 }))).toBe(false)
  })
})
