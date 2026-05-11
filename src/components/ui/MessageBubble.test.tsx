// @vitest-environment jsdom

import { describe, it, expect, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { MessageBubble } from "./MessageBubble"

afterEach(() => cleanup())

describe("MessageBubble", () => {
  it("renders user message right-aligned with gradient", () => {
    render(<MessageBubble role="user" content="hello world" />)
    const text = screen.getByText("hello world")
    const bubble = text.parentElement!
    const container = bubble.parentElement!
    expect(container.className).toContain("justify-end")
    expect(bubble.className).toContain("from-indigo-500")
  })

  it("renders ai message left-aligned with glass style", () => {
    render(<MessageBubble role="ai" content="AI response" />)
    const text = screen.getByText("AI response")
    const bubble = text.parentElement!
    const container = bubble.parentElement!
    expect(container.className).toContain("justify-start")
    expect(bubble.className).toContain("glass")
  })

  it("renders content without trimming", () => {
    const { container } = render(<MessageBubble role="user" content="  spaced  " />)
    expect(container.textContent).toContain("  spaced  ")
  })
})
