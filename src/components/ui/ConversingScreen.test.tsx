// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { createRef } from "react"
import { ConversingScreen } from "./ConversingScreen"

beforeEach(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    configurable: true,
  })
})

afterEach(() => cleanup())

const defaultProps = {
  mode: "interview" as const,
  industry: "tech" as const,
  topic: null,
  difficulty: "intermediate" as const,
  selectedLang: "en-US",
  error: null,
  messages: [] as { role: string; content: string }[],
  displayTranscript: "",
  interimTranscript: "",
  messagesEndRef: createRef<HTMLDivElement>(),
  isListening: false,
  isAiSpeaking: false,
  isSubmitting: false,
  loading: false,
  timeLeft: 900,
  formatTime: (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`,
  onEndInterview: vi.fn(),
}

describe("ConversingScreen", () => {
  it("renders sidebar with industry badge in interview mode", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("Tech")).toBeDefined()
  })

  it("renders sidebar with topic badge in conversation mode", () => {
    render(
      <ConversingScreen {...defaultProps} mode="conversation" topic="travel" />
    )
    expect(screen.getByText("travel")).toBeDefined()
  })

  it("renders Free Talk when no topic in conversation mode", () => {
    render(
      <ConversingScreen {...defaultProps} mode="conversation" topic={null} />
    )
    expect(screen.getByText("Free Talk")).toBeDefined()
  })

  it("renders difficulty", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("intermediate")).toBeDefined()
  })

  it("renders mode label", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("interview")).toBeDefined()
  })

  it("renders language label", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("English (US)")).toBeDefined()
  })

  it("renders timer", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("15:00")).toBeDefined()
  })

  it("renders timer in red when less than 60s", () => {
    render(<ConversingScreen {...defaultProps} timeLeft={45} />)
    expect(screen.getByText("0:45")).toBeDefined()
  })

  it("renders remaining label", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("remaining")).toBeDefined()
  })

  it("renders End Session button", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("End Session")).toBeDefined()
  })

  it("disables End Session when loading", () => {
    render(<ConversingScreen {...defaultProps} loading={true} />)
    expect((screen.getByText("End Session") as HTMLButtonElement).disabled).toBe(true)
  })

  it("calls onEndInterview when End Session clicked", () => {
    const onEndInterview = vi.fn()
    render(
      <ConversingScreen {...defaultProps} onEndInterview={onEndInterview} />
    )
    fireEvent.click(screen.getByText("End Session"))
    expect(onEndInterview).toHaveBeenCalledOnce()
  })

  it("renders error banner", () => {
    render(<ConversingScreen {...defaultProps} error="Connection lost" />)
    expect(screen.getByText("Connection lost")).toBeDefined()
  })

  it("renders messages", () => {
    const messages = [
      { role: "ai", content: "Hello!" },
      { role: "user", content: "Hi there" },
    ]
    render(<ConversingScreen {...defaultProps} messages={messages} />)
    expect(screen.getByText("Hello!")).toBeDefined()
    expect(screen.getByText("Hi there")).toBeDefined()
  })

  it("renders display transcript", () => {
    render(<ConversingScreen {...defaultProps} displayTranscript="My answer" />)
    expect(screen.getByText("My answer")).toBeDefined()
  })

  it("renders interim transcript", () => {
    render(
      <ConversingScreen
        {...defaultProps}
        displayTranscript="partial"
        interimTranscript="..."
      />
    )
    expect(screen.getByText("...")).toBeDefined()
  })

  it("shows listening status text", () => {
    render(<ConversingScreen {...defaultProps} isListening={true} />)
    expect(screen.getByText(/Listening — speak naturally/)).toBeDefined()
  })

  it("shows AI speaking status", () => {
    render(<ConversingScreen {...defaultProps} isAiSpeaking={true} />)
    expect(screen.getByText("AI is speaking...")).toBeDefined()
  })

  it("shows processing status", () => {
    render(<ConversingScreen {...defaultProps} isSubmitting={true} />)
    expect(screen.getByText("Processing...")).toBeDefined()
  })

  it("shows not listening when idle", () => {
    render(<ConversingScreen {...defaultProps} />)
    expect(screen.getByText("Not listening")).toBeDefined()
  })
})
