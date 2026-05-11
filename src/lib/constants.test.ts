import { describe, it, expect } from "vitest"
import { LANGUAGES, SPEECH_RATES } from "./constants"

describe("constants", () => {
  it("exports LANGUAGES with 20 entries", () => {
    expect(LANGUAGES).toHaveLength(20)
    expect(LANGUAGES[0]).toEqual({ value: "en-US", label: "English (US)" })
  })

  it("exports SPEECH_RATES with 4 entries", () => {
    expect(SPEECH_RATES).toHaveLength(4)
    expect(SPEECH_RATES[2]).toEqual({ value: 0.9, label: "Normal" })
  })
})
