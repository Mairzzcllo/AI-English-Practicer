// @vitest-environment jsdom

import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAiVoiceFilter } from "./useAiVoiceFilter"

describe("useAiVoiceFilter", () => {
  it("does not filter when AI is not speaking", () => {
    const { result } = renderHook(() => useAiVoiceFilter())
    expect(result.current.shouldFilter("hello world")).toBe(false)
  })

  it("filters when user text heavily overlaps AI text", () => {
    const { result } = renderHook(() => useAiVoiceFilter())

    act(() => result.current.setAiSpeaking("The quick brown fox jumps over the lazy dog"))

    expect(result.current.shouldFilter("the quick brown fox")).toBe(true)
    expect(result.current.shouldFilter("brown fox jumps over dog")).toBe(true)
  })

  it("does not filter when user text barely overlaps AI text", () => {
    const { result } = renderHook(() => useAiVoiceFilter())

    act(() => result.current.setAiSpeaking("What is your favorite color"))

    expect(result.current.shouldFilter("my favorite color is blue")).toBe(false)
    expect(result.current.shouldFilter("I like pizza")).toBe(false)
  })

  it("does not filter when both texts are empty", () => {
    const { result } = renderHook(() => useAiVoiceFilter())

    act(() => result.current.setAiSpeaking("hello world"))

    expect(result.current.shouldFilter("")).toBe(false)
  })

  it("stops filtering after AI stops speaking", () => {
    const { result } = renderHook(() => useAiVoiceFilter())

    act(() => result.current.setAiSpeaking("The quick brown fox"))
    expect(result.current.shouldFilter("the quick")).toBe(true)

    act(() => result.current.setAiStopped())
    expect(result.current.shouldFilter("the quick")).toBe(false)
  })

  it("tracks isAiSpeaking state correctly", () => {
    const { result } = renderHook(() => useAiVoiceFilter())

    expect(result.current.isAiSpeaking).toBe(false)

    act(() => result.current.setAiSpeaking("hello"))
    expect(result.current.isAiSpeaking).toBe(true)

    act(() => result.current.setAiStopped())
    expect(result.current.isAiSpeaking).toBe(false)
  })

  it("normalizes punctuation for comparison", () => {
    const { result } = renderHook(() => useAiVoiceFilter())

    act(() => result.current.setAiSpeaking("Hello, world! How are you?"))

    expect(result.current.shouldFilter("hello world")).toBe(true)
    expect(result.current.shouldFilter("Hello, world!")).toBe(true)
  })

  it("uses latest AI text for overlap check", () => {
    const { result } = renderHook(() => useAiVoiceFilter())

    act(() => result.current.setAiSpeaking("first question"))
    expect(result.current.shouldFilter("first question exactly")).toBe(true)

    act(() => result.current.setAiSpeaking("completely different topic"))
    expect(result.current.shouldFilter("first question")).toBe(false)
    expect(result.current.shouldFilter("completely different")).toBe(true)
  })
})
