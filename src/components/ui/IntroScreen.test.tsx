// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { IntroScreen } from "./IntroScreen"

afterEach(() => cleanup())

const defaultProps = {
  mode: "interview" as const,
  industry: "tech" as const,
  topic: null,
  difficulty: "intermediate" as const,
  selectedLang: "en-US",
  speechRate: 0.9,
  micPermission: null as PermissionState | null,
  error: null,
  sttSupported: true,
  sttError: "",
  loading: false,
  onStart: vi.fn(),
  onLangChange: vi.fn(),
  onRateChange: vi.fn(),
}

describe("IntroScreen", () => {
  it("renders interview mode title and description", () => {
    render(<IntroScreen {...defaultProps} />)
    expect(screen.getByText("Ready to Practice?")).toBeDefined()
    expect(screen.getByText(/15-minute conversational interview/i)).toBeDefined()
  })

  it("renders conversation mode title and description", () => {
    render(<IntroScreen {...defaultProps} mode="conversation" topic="travel" />)
    expect(screen.getByText("Let's Talk!")).toBeDefined()
    expect(screen.getByText(/relaxed 15-minute conversation/i)).toBeDefined()
  })

  it("shows industry badge in interview mode", () => {
    render(<IntroScreen {...defaultProps} industry="marketing" />)
    expect(screen.getByText(/Marketing · intermediate/i)).toBeDefined()
  })

  it("shows topic badge in conversation mode", () => {
    render(<IntroScreen {...defaultProps} mode="conversation" topic="travel" />)
    expect(screen.getByText(/travel · intermediate/i)).toBeDefined()
  })

  it("shows Free Talk badge when no topic", () => {
    render(<IntroScreen {...defaultProps} mode="conversation" topic={null} />)
    expect(screen.getByText(/Free Talk · intermediate/i)).toBeDefined()
  })

  it("renders language select", () => {
    render(<IntroScreen {...defaultProps} />)
    expect(screen.getByDisplayValue("English (US)")).toBeDefined()
  })

  it("renders speed select", () => {
    render(<IntroScreen {...defaultProps} />)
    expect(screen.getByDisplayValue("Normal")).toBeDefined()
  })

  it("calls onLangChange when language changes", () => {
    const onLangChange = vi.fn()
    render(<IntroScreen {...defaultProps} onLangChange={onLangChange} />)
    fireEvent.change(screen.getByDisplayValue("English (US)"), {
      target: { value: "zh-CN" },
    })
    expect(onLangChange).toHaveBeenCalledWith("zh-CN")
  })

  it("calls onRateChange when speed changes", () => {
    const onRateChange = vi.fn()
    render(<IntroScreen {...defaultProps} onRateChange={onRateChange} />)
    fireEvent.change(screen.getByDisplayValue("Normal"), {
      target: { value: "0.5" },
    })
    expect(onRateChange).toHaveBeenCalledWith(0.5)
  })

  it("renders start button with interview text", () => {
    render(<IntroScreen {...defaultProps} />)
    expect(screen.getByText("Begin Interview")).toBeDefined()
  })

  it("renders start button with conversation text", () => {
    render(<IntroScreen {...defaultProps} mode="conversation" />)
    expect(screen.getByText("Start Talking")).toBeDefined()
  })

  it("shows Starting... when loading", () => {
    render(<IntroScreen {...defaultProps} loading={true} />)
    expect(screen.getByText("Starting...")).toBeDefined()
  })

  it("disables button when loading", () => {
    render(<IntroScreen {...defaultProps} loading={true} />)
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true)
  })

  it("calls onStart when button clicked", () => {
    const onStart = vi.fn()
    render(<IntroScreen {...defaultProps} onStart={onStart} />)
    fireEvent.click(screen.getByText("Begin Interview"))
    expect(onStart).toHaveBeenCalledOnce()
  })

  it("shows error message", () => {
    render(<IntroScreen {...defaultProps} error="Something went wrong" />)
    expect(screen.getByText("Something went wrong")).toBeDefined()
  })

  it("shows STT error when not supported", () => {
    render(
      <IntroScreen
        {...defaultProps}
        sttSupported={false}
        sttError="Speech recognition not available"
      />
    )
    expect(screen.getByText("Speech recognition not available")).toBeDefined()
  })

  it("renders MicPermissionBanner", () => {
    render(<IntroScreen {...defaultProps} micPermission="prompt" />)
    expect(screen.getByText(/needs microphone access/i)).toBeDefined()
  })
})
