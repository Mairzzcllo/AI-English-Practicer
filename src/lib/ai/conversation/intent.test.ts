import { describe, it, expect } from "vitest"
import { classifyIntent } from "./intent"

describe("classifyIntent", () => {
  it("classifies empty input as continue_conversation with low confidence", () => {
    const result = classifyIntent("")
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBeLessThan(0.5)
  })

  it("classifies short space input as continue_conversation with low confidence", () => {
    const result = classifyIntent("   ")
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBeLessThan(0.5)
  })

  it("classifies 'please' as continue_conversation", () => {
    const result = classifyIntent("please")
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it("classifies 'go on' as continue_conversation", () => {
    const result = classifyIntent("go on")
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it("classifies 'tell me more' as continue_conversation", () => {
    const result = classifyIntent("tell me more")
    expect(result.intent).toBe("continue_conversation")
  })

  it("classifies 'what does that mean' as ask_definition", () => {
    const result = classifyIntent("what does that mean")
    expect(result.intent).toBe("ask_definition")
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it("classifies 'define X' as ask_definition", () => {
    const result = classifyIntent("define recursion")
    expect(result.intent).toBe("ask_definition")
  })

  it("classifies 'what is X' as ask_definition", () => {
    const result = classifyIntent("what is a callback")
    expect(result.intent).toBe("ask_definition")
  })

  it("classifies 'what's X' as ask_definition", () => {
    const result = classifyIntent("what's closure")
    expect(result.intent).toBe("ask_definition")
  })

  it("classifies 'what are X' as ask_definition", () => {
    const result = classifyIntent("what are closures")
    expect(result.intent).toBe("ask_definition")
  })

  it("classifies 'is that correct' as ask_correction", () => {
    const result = classifyIntent("is that correct")
    expect(result.intent).toBe("ask_correction")
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it("classifies 'did I say that right' as ask_correction", () => {
    const result = classifyIntent("did I say that right")
    expect(result.intent).toBe("ask_correction")
  })

  it("classifies 'correct me' as ask_correction", () => {
    const result = classifyIntent("can you correct me")
    expect(result.intent).toBe("ask_correction")
  })

  it("classifies 'how are you' as small_talk", () => {
    const result = classifyIntent("how are you")
    expect(result.intent).toBe("small_talk")
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it("classifies 'nice to meet you' as small_talk", () => {
    const result = classifyIntent("nice to meet you")
    expect(result.intent).toBe("small_talk")
  })

  it("classifies 'um' as hesitation with low confidence", () => {
    const result = classifyIntent("um")
    expect(result.intent).toBe("hesitation")
    expect(result.confidence).toBeLessThan(0.5)
  })

  it("classifies 'uh well' as hesitation", () => {
    const result = classifyIntent("uh well")
    expect(result.intent).toBe("hesitation")
  })

  it("classifies input with trailing ellipsis as hesitation", () => {
    const result = classifyIntent("I mean...")
    expect(result.intent).toBe("hesitation")
  })

  it("classifies 'okay' as confirmation", () => {
    const result = classifyIntent("okay")
    expect(result.intent).toBe("confirmation")
    expect(result.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it("classifies 'yeah' as confirmation", () => {
    const result = classifyIntent("yeah")
    expect(result.intent).toBe("confirmation")
  })

  it("classifies 'I see' as confirmation", () => {
    const result = classifyIntent("I see")
    expect(result.intent).toBe("confirmation")
  })

  it("classifies 'got it' as confirmation", () => {
    const result = classifyIntent("got it")
    expect(result.intent).toBe("confirmation")
  })

  it("classifies 'yes' as confirmation", () => {
    const result = classifyIntent("yes")
    expect(result.intent).toBe("confirmation")
  })

  it("classifies 'right' as confirmation", () => {
    const result = classifyIntent("right")
    expect(result.intent).toBe("confirmation")
  })

  it("classifies 'I feel great' as emotional_expression", () => {
    const result = classifyIntent("I feel great")
    expect(result.intent).toBe("emotional_expression")
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it("classifies 'wow amazing' as emotional_expression", () => {
    const result = classifyIntent("wow amazing")
    expect(result.intent).toBe("emotional_expression")
  })

  it("classifies 'that's awesome' as emotional_expression", () => {
    const result = classifyIntent("that's awesome")
    expect(result.intent).toBe("emotional_expression")
  })

  it("classifies ambiguous input with highest confidence match", () => {
    const result = classifyIntent("yes please")
    expect(result.confidence).toBeGreaterThan(0.3)
  })

  it("returns confidence in [0, 1] range", () => {
    const inputs = ["", "hello world", "what does X mean", "okay", "um", "how are you", "I feel sad"]
    for (const input of inputs) {
      const result = classifyIntent(input)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.intent).toBeDefined()
    }
  })
})
