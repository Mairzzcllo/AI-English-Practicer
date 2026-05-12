import { describe, it, expect } from "vitest"
import { SPEECH_RATES } from "./constants"

describe("constants", () => {
  it("exports SPEECH_RATES with 4 entries", () => {
    expect(SPEECH_RATES).toHaveLength(4)
    expect(SPEECH_RATES[2]).toEqual({ value: 0.9, label: "Normal" })
  })
})
