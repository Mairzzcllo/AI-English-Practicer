import { connectDB } from "./mongoose"
import { Session as MongoSession, type IMessage } from "@/models/Session"
import { getMemStore } from "./memstore"
import type { Mode, Industry, Difficulty, Topic } from "@/types"

export interface SessionData {
  _id: string
  mode: Mode
  industry?: Industry
  topic?: Topic
  difficulty: Difficulty
  status: "in_progress" | "completed"
  messages: { role: "ai" | "user"; content: string; createdAt: Date }[]
  startedAt: Date
  endedAt?: Date
  summary?: {
    overallScore: number
    summary: string
    strengths: string[]
    improvements: string[]
  }
  createdAt: Date
  updatedAt: Date
}

let useMongo = true

async function checkMongo() {
  if (!useMongo) return false
  try {
    await connectDB()
    return true
  } catch {
    console.warn("MongoDB unavailable — falling back to in-memory store. Data will not persist after restart.")
    useMongo = false
    return false
  }
}

export async function createSession(
  params: {
    mode: Mode
    industry?: Industry
    topic?: Topic
    difficulty: Difficulty
    firstMessage: { role: "ai"; content: string; createdAt: Date }
  }
): Promise<string> {
  const { mode, industry, topic, difficulty, firstMessage } = params
  if (await checkMongo()) {
    const session = await MongoSession.create({
      mode, industry, topic, difficulty, status: "in_progress",
      messages: [firstMessage],
      startedAt: new Date(),
    })
    return session._id.toString()
  }
  const mem = getMemStore()
  const now = new Date()
  const doc = await mem.sessions.create({
    mode, industry, topic, difficulty, status: "in_progress",
    messages: [firstMessage],
    startedAt: now,
    createdAt: now, updatedAt: now,
  })
  return doc._id as string
}

export async function getSession(id: string): Promise<SessionData | null> {
  if (await checkMongo()) {
    const s = await MongoSession.findById(id).lean()
    return s ? ({ ...s, _id: s._id.toString() } as unknown as SessionData) : null
  }
  const doc = await getMemStore().sessions.findById(id)
  return doc as unknown as SessionData | null
}

export async function addMessage(
  sessionId: string, message: { role: "ai" | "user"; content: string; createdAt: Date }
) {
  if (await checkMongo()) {
    const session = await MongoSession.findById(sessionId)
    if (!session) return
    session.messages.push(message as IMessage)
    await session.save()
    return
  }
  const mem = getMemStore()
  const doc = await mem.sessions.findById(sessionId)
  if (!doc) return
  const msgs = (doc.messages as { role: string; content: string; createdAt: Date }[]) ?? []
  msgs.push(message)
  doc.messages = msgs
  mem.sessions.save(doc)
}

export async function completeSession(
  sessionId: string, summary?: { overallScore: number; summary: string; strengths: string[]; improvements: string[] }
) {
  if (await checkMongo()) {
    const session = await MongoSession.findById(sessionId)
    if (!session) return
    session.status = "completed"
    session.endedAt = new Date()
    if (summary) session.summary = summary
    await session.save()
    return
  }
  const mem = getMemStore()
  const doc = await mem.sessions.findById(sessionId)
  if (!doc) return
  doc.status = "completed"
  doc.endedAt = new Date()
  if (summary) doc.summary = summary as Record<string, unknown>
  mem.sessions.save(doc)
}

export async function deleteSession(sessionId: string) {
  if (await checkMongo()) {
    await MongoSession.findByIdAndDelete(sessionId)
    return
  }
  const mem = getMemStore()
  await mem.sessions.delete(sessionId)
}

export async function listSessions(): Promise<SessionData[]> {
  if (await checkMongo()) {
    const sessions = await MongoSession.find({ status: "completed" })
      .sort({ createdAt: -1 })
      .select("mode industry topic difficulty createdAt messages summary")
      .lean()
    return sessions.map((s) => ({ ...s, _id: s._id.toString() } as unknown as SessionData))
  }
  const mem = getMemStore()
  const docs = await mem.sessions.find({ status: "completed" })
  return docs.sort(
    (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
  ) as unknown as SessionData[]
}
