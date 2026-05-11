// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { AudioVisualizer } from "./AudioVisualizer"

afterEach(() => cleanup())

function mockMediaDevices() {
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockRejectedValue(new Error("mock")),
    },
    configurable: true,
  })
}

describe("AudioVisualizer", () => {
  it("renders a canvas element", () => {
    const { container } = render(<AudioVisualizer isActive={false} />)
    const canvas = container.querySelector("canvas")
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute("width")).toBe("100")
    expect(canvas!.getAttribute("height")).toBe("20")
    expect(canvas!.className).toContain("rounded")
  })

  it("renders with isActive true without crashing", () => {
    mockMediaDevices()
    const { container } = render(<AudioVisualizer isActive={true} />)
    expect(container.querySelector("canvas")).not.toBeNull()
  })
})
