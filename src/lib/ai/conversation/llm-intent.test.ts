import { describe, it, expect, vi, beforeEach } from "vitest"
import { classifyIntentWithLLM, getLLMFallbackThreshold } from "./llm-intent"

function mockFetch(response: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(response),
  })
}

function mockOpenAIResponse(intent: string, confidence: number) {
  return {
    choices: [{ message: { content: JSON.stringify({ intent, confidence }) } }],
  }
}

function mockDeepSeekResponse(intent: string, confidence: number) {
  return {
    choices: [{ message: { content: `{"intent": "${intent}", "confidence": ${confidence}}` } }],
  }
}

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "sk-test-key")
  vi.stubEnv("AI_PROVIDER", "openai")
})

describe("getLLMFallbackThreshold", () => {
  it("returns the threshold constant", () => {
    expect(getLLMFallbackThreshold()).toBe(0.4)
  })
})

describe("classifyIntentWithLLM", () => {
  it("classifies ask_definition input correctly", async () => {
    const fetch = mockFetch(mockOpenAIResponse("ask_definition", 0.95))
    const result = await classifyIntentWithLLM("what does asynchronous mean", fetch)
    expect(result.intent).toBe("ask_definition")
    expect(result.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it("classifies small_talk input correctly", async () => {
    const fetch = mockFetch(mockOpenAIResponse("small_talk", 0.85))
    const result = await classifyIntentWithLLM("how are you today", fetch)
    expect(result.intent).toBe("small_talk")
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it("classifies emotional_expression input correctly", async () => {
    const fetch = mockFetch(mockOpenAIResponse("emotional_expression", 0.9))
    const result = await classifyIntentWithLLM("I'm so excited about this", fetch)
    expect(result.intent).toBe("emotional_expression")
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it("classifies confirmation input correctly", async () => {
    const fetch = mockFetch(mockOpenAIResponse("confirmation", 0.8))
    const result = await classifyIntentWithLLM("got it thanks", fetch)
    expect(result.intent).toBe("confirmation")
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it("classifies hesitation input correctly", async () => {
    const fetch = mockFetch(mockOpenAIResponse("hesitation", 0.7))
    const result = await classifyIntentWithLLM("um well I'm not sure", fetch)
    expect(result.intent).toBe("hesitation")
    expect(result.confidence).toBeGreaterThanOrEqual(0.6)
  })

  it("returns fallback for empty input", async () => {
    const fetch = mockFetch(mockOpenAIResponse("continue_conversation", 0.3))
    const result = await classifyIntentWithLLM("", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBeLessThanOrEqual(0.35)
  })

  it("returns fallback for whitespace input", async () => {
    const fetch = mockFetch(mockOpenAIResponse("continue_conversation", 0.3))
    const result = await classifyIntentWithLLM("   ", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBeLessThanOrEqual(0.35)
  })

  it("handles API error gracefully", async () => {
    const fetch = mockFetch({ error: "API error" }, false)
    const result = await classifyIntentWithLLM("hello world", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBe(0.3)
  })

  it("handles network error gracefully", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("Network error"))
    const result = await classifyIntentWithLLM("hello world", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBe(0.3)
  })

  it("handles missing API key gracefully", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    const fetch = vi.fn()
    const result = await classifyIntentWithLLM("hello world", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBe(0.3)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sanitizes unknown intent from LLM", async () => {
    const fetch = mockFetch(mockOpenAIResponse("unknown_intent", 0.9))
    const result = await classifyIntentWithLLM("hello", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBe(0.3)
  })

  it("clamps out-of-range confidence", async () => {
    const fetch = mockFetch(mockOpenAIResponse("ask_definition", 99))
    const result = await classifyIntentWithLLM("what is X", fetch)
    expect(result.intent).toBe("ask_definition")
    expect(result.confidence).toBe(1)
  })

  it("clamps negative confidence", async () => {
    const fetch = mockFetch(mockOpenAIResponse("ask_definition", -5))
    const result = await classifyIntentWithLLM("what is X", fetch)
    expect(result.intent).toBe("ask_definition")
    expect(result.confidence).toBe(0)
  })

  it("handles missing confidence by defaulting to 0.5", async () => {
    const fetch = mockFetch({ choices: [{ message: { content: '{"intent": "small_talk"}' } }] })
    const result = await classifyIntentWithLLM("how are you", fetch)
    expect(result.intent).toBe("small_talk")
    expect(result.confidence).toBe(0.5)
  })

  it("handles DeepSeek provider", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek")
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-ds-test")
    const fetch = mockFetch(mockDeepSeekResponse("ask_correction", 0.88))
    const result = await classifyIntentWithLLM("is this correct", fetch)
    expect(result.intent).toBe("ask_correction")
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it("uses configured fetch function", async () => {
    const fetch = mockFetch(mockOpenAIResponse("emotional_expression", 0.85))
    await classifyIntentWithLLM("that's amazing", fetch)
    expect(fetch).toHaveBeenCalledTimes(1)
    const callUrl = fetch.mock.calls[0][0]
    expect(callUrl).toContain("api.openai.com")
  })

  it("sends the user input to the LLM", async () => {
    const fetch = mockFetch(mockOpenAIResponse("continue_conversation", 0.5))
    await classifyIntentWithLLM("tell me more about that", fetch)
    const callBody = JSON.parse(fetch.mock.calls[0][1].body)
    expect(callBody.messages[1].content).toBe("tell me more about that")
  })

  it("includes response_format for OpenAI provider", async () => {
    const fetch = mockFetch(mockOpenAIResponse("continue_conversation", 0.5))
    await classifyIntentWithLLM("hello", fetch)
    const callBody = JSON.parse(fetch.mock.calls[0][1].body)
    expect(callBody.response_format).toEqual({ type: "json_object" })
  })

  it("does not include response_format for DeepSeek provider", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek")
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-ds-test")
    const fetch = mockFetch(mockDeepSeekResponse("continue_conversation", 0.5))
    await classifyIntentWithLLM("hello", fetch)
    const callBody = JSON.parse(fetch.mock.calls[0][1].body)
    expect(callBody.response_format).toBeUndefined()
  })

  it("handles malformed JSON from API", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: "not json at all" } }] }),
    })
    const result = await classifyIntentWithLLM("hello", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBe(0.3)
  })

  it("handles missing choices in response", async () => {
    const fetch = mockFetch({})
    const result = await classifyIntentWithLLM("hello", fetch)
    expect(result.intent).toBe("continue_conversation")
    expect(result.confidence).toBe(0.3)
  })
})
