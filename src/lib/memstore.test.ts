import { describe, it, expect, beforeEach } from "vitest"
import { getMemStore, resetMemStore } from "./memstore"

describe("InMemoryCollection", () => {
  beforeEach(() => {
    resetMemStore()
  })
  it("creates a document with auto-generated _id", async () => {
    const store = getMemStore()
    const doc = await store.sessions.create({ name: "test" })
    expect(doc._id).toBeDefined()
    expect(typeof doc._id).toBe("string")
    expect(doc._id as string).toMatch(/^mem_\d+_\d+$/)
  })

  it("findById returns null for missing doc", async () => {
    const store = getMemStore()
    const doc = await store.sessions.findById("nonexistent")
    expect(doc).toBeNull()
  })

  it("findById returns created doc", async () => {
    const store = getMemStore()
    const created = await store.sessions.create({ name: "findme" })
    const found = await store.sessions.findById(created._id as string)
    expect(found).not.toBeNull()
    expect(found).toHaveProperty("name", "findme")
  })

  it("find returns all docs without filter", async () => {
    const store = getMemStore()
    await store.sessions.create({ x: 1 })
    await store.sessions.create({ x: 2 })
    const all = await store.sessions.find()
    expect(all.length).toBeGreaterThanOrEqual(2)
  })

  it("find filters by field value", async () => {
    const store = getMemStore()
    await store.sessions.create({ role: "admin" })
    await store.sessions.create({ role: "user" })
    const filtered = await store.sessions.find({ role: "admin" })
    expect(filtered.length).toBe(1)
    expect(filtered[0]).toHaveProperty("role", "admin")
  })

  it("save mutates existing doc in place", async () => {
    const store = getMemStore()
    const created = await store.sessions.create({ status: "new" })
    created.status = "updated"
    store.sessions.save(created)
    const found = await store.sessions.findById(created._id as string)
    expect(found).toHaveProperty("status", "updated")
  })
})
