import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"
import { resetPersonaStore } from "@/lib/ai/persona/store"

const mockGetSession = vi.fn()
const mockAddMessage = vi.fn()
const mockGenerateConversationResponse = vi.fn()

vi.mock("@/lib/store", () => ({
  getSession: mockGetSession,
  addMessage: mockAddMessage,
}))

vi.mock("@/lib/ai", () => ({
  createAiAdapter: () => ({
    generateConversationResponse: mockGenerateConversationResponse,
  }),
}))

function createMockRequest(data: unknown): NextRequest {
  return { json: () => Promise.resolve(data) } as unknown as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  resetPersonaStore()
  mockGetSession.mockReset()
  mockAddMessage.mockReset()
  mockGenerateConversationResponse.mockReset()
  mockGenerateConversationResponse.mockResolvedValue({ content: "OK", shouldEnd: false })
})

describe("talk route POST - persona integration", () => {
  it("builds persona prompt for conversation mode", async () => {
    mockGetSession.mockResolvedValue({
      _id: "s1", mode: "conversation", difficulty: "beginner", topic: "travel", messages: [],
    })
    const { POST } = await import("./route")
    await POST(createMockRequest({ sessionId: "s1", transcript: "What do you think about travel?" }))

    expect(mockGenerateConversationResponse).toHaveBeenCalled()
    const args = mockGenerateConversationResponse.mock.calls[0]
    expect(args[1]).toBe("conversation")
    expect(args[5]).toBeDefined()
    expect(args[5]).toContain("Alex")
  })

  it("does not build persona prompt for interview mode", async () => {
    mockGetSession.mockResolvedValue({
      _id: "s2", mode: "interview", difficulty: "intermediate", industry: "tech", messages: [],
    })
    const { POST } = await import("./route")
    await POST(createMockRequest({ sessionId: "s2", transcript: "Tell me about yourself." }))

    expect(mockGenerateConversationResponse).toHaveBeenCalled()
    const args = mockGenerateConversationResponse.mock.calls[0]
    expect(args[1]).toBe("interview")
    expect(args[5]).toBeUndefined()
  })

  it("persists persona agent state across consecutive turns", async () => {
    mockGetSession.mockResolvedValue({
      _id: "s3", mode: "conversation", difficulty: "beginner", messages: [],
    })
    const { POST } = await import("./route")
    await POST(createMockRequest({ sessionId: "s3", transcript: "Hi" }))
    await POST(createMockRequest({ sessionId: "s3", transcript: "I love learning English" }))

    expect(mockGenerateConversationResponse).toHaveBeenCalledTimes(2)
    const firstArgs = mockGenerateConversationResponse.mock.calls[0]
    const secondArgs = mockGenerateConversationResponse.mock.calls[1]
    expect(firstArgs[5]).toContain("turn 1")
    expect(secondArgs[5]).toContain("turn 2")
  })

  it("handles missing session gracefully", async () => {
    mockGetSession.mockResolvedValue(null)
    const { POST } = await import("./route")
    const res = await POST(createMockRequest({ sessionId: "nonexistent", transcript: "Hello" }))
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe("Session not found")
  })

  it("returns 500 on adapter failure", async () => {
    mockGetSession.mockResolvedValue({
      _id: "s4", mode: "conversation", difficulty: "beginner", messages: [],
    })
    mockGenerateConversationResponse.mockRejectedValue(new Error("API error"))
    const { POST } = await import("./route")
    const res = await POST(createMockRequest({ sessionId: "s4", transcript: "Hello" }))
    expect(res.status).toBe(500)
  })
})
