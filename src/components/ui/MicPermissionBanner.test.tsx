// @vitest-environment jsdom

import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { MicPermissionBanner } from "./MicPermissionBanner"

afterEach(() => cleanup())

describe("MicPermissionBanner", () => {
  it("returns null when granted", () => {
    const { container } = render(<MicPermissionBanner state="granted" />)
    expect(container.innerHTML).toBe("")
  })

  it("returns null when null", () => {
    const { container } = render(<MicPermissionBanner state={null} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows denied message", () => {
    render(<MicPermissionBanner state="denied" />)
    expect(screen.getByText(/Microphone access is blocked/i)).toBeDefined()
  })

  it("shows prompt message", () => {
    render(<MicPermissionBanner state="prompt" />)
    expect(screen.getByText(/needs microphone access/i)).toBeDefined()
  })
})
