import { describe, it, expect } from "vitest"
import { assessAmbiguity, getCarryOnHint } from "./ambiguity"
import type { IntentResult } from "./types"

function result(overrides?: Partial<IntentResult>): IntentResult {
  return { intent: "continue_conversation", confidence: 0.6, ...overrides }
}

describe("assessAmbiguity", () => {
  it("returns shouldCarryOn=false for confident input", () => {
    const a = assessAmbiguity(result({ confidence: 0.8 }), "hello how are you today")
    expect(a.shouldCarryOn).toBe(false)
    expect(a.level).toBe("none")
  })

  it("returns shouldCarryOn=true for empty input", () => {
    const a = assessAmbiguity(result({ confidence: 0 }), "")
    expect(a.shouldCarryOn).toBe(true)
    expect(a.level).toBe("high")
  })

  it("returns shouldCarryOn=true for whitespace input", () => {
    const a = assessAmbiguity(result({ confidence: 0 }), "   ")
    expect(a.shouldCarryOn).toBe(true)
  })

  it("returns shouldCarryOn=true for very short input", () => {
    const a = assessAmbiguity(result({ confidence: 0.2 }), "a")
    expect(a.shouldCarryOn).toBe(true)
  })

  it("returns shouldCarryOn=true for low confidence short input", () => {
    const a = assessAmbiguity(result({ confidence: 0.3 }), "hello")
    expect(a.shouldCarryOn).toBe(true)
  })

  it("returns shouldCarryOn=false for low confidence long input", () => {
    const a = assessAmbiguity(result({ confidence: 0.3 }), "i think the best way to learn english is through practice")
    expect(a.shouldCarryOn).toBe(false)
  })

  it("returns high level for empty or very short input", () => {
    const a = assessAmbiguity(result({ confidence: 0 }), "")
    expect(a.level).toBe("high")
  })

  it("returns low level for moderately ambiguous input", () => {
    const a = assessAmbiguity(result({ confidence: 0.35 }), "hello")
    expect(a.level).toBe("low")
  })

  it("returns none for confident input", () => {
    const a = assessAmbiguity(result({ confidence: 0.9 }), "what is a callback function")
    expect(a.level).toBe("none")
  })
})

describe("getCarryOnHint", () => {
  it("returns undefined when shouldCarryOn is false", () => {
    const hint = getCarryOnHint({ level: "none", shouldCarryOn: false })
    expect(hint).toBeUndefined()
  })

  it("returns carry-on hint when shouldCarryOn is true", () => {
    const hint = getCarryOnHint({ level: "high", shouldCarryOn: true })
    expect(hint).toBeTruthy()
    expect(hint).toContain("carry-on")
  })

  it("returns strict hint for high ambiguity", () => {
    const hint = getCarryOnHint({ level: "high", shouldCarryOn: true })
    expect(hint).toContain("Do not analyze")
  })

  it("returns gentle hint for low ambiguity", () => {
    const hint = getCarryOnHint({ level: "low", shouldCarryOn: true })
    expect(hint).toContain("brief")
  })
})
