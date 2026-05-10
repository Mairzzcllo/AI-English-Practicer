import { describe, it, expect, beforeEach } from "vitest"

describe("createAiAdapter", () => {
  beforeEach(() => {
    delete process.env.AI_PROVIDER
    delete process.env.OPENAI_API_KEY
    delete process.env.DEEPSEEK_API_KEY
  })

  it("throws for unknown provider", async () => {
    process.env.AI_PROVIDER = "nonexistent"
    const { createAiAdapter } = await import("./ai/index")
    expect(() => createAiAdapter()).toThrow("Unknown AI provider")
  })

  it("returns OpenAIAdapter when provider is openai", async () => {
    process.env.AI_PROVIDER = "openai"
    process.env.OPENAI_API_KEY = "sk-test"
    const { createAiAdapter } = await import("./ai/index")
    const adapter = createAiAdapter()
    expect(adapter.constructor.name).toBe("OpenAIAdapter")
  })

  it("returns DeepSeekAdapter when provider is deepseek", async () => {
    process.env.AI_PROVIDER = "deepseek"
    process.env.DEEPSEEK_API_KEY = "sk-test"
    const { createAiAdapter } = await import("./ai/index")
    const adapter = createAiAdapter()
    expect(adapter.constructor.name).toBe("DeepSeekAdapter")
  })

  it("defaults to openai when AI_PROVIDER is unset", async () => {
    process.env.OPENAI_API_KEY = "sk-test"
    const { createAiAdapter } = await import("./ai/index")
    const adapter = createAiAdapter()
    expect(adapter.constructor.name).toBe("OpenAIAdapter")
  })
})

describe("connectDB", () => {
  beforeEach(() => {
    delete process.env.MONGODB_URI
  })

  it("throws when MONGODB_URI is missing", async () => {
    const { connectDB } = await import("./mongoose")
    await expect(connectDB()).rejects.toThrow("MONGODB_URI")
  })
})
