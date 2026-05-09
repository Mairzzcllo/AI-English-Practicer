import { connectDB } from "./mongoose"
import { Session as MongoSession, type IQuestion } from "@/models/Session"
import { getMemStore } from "./memstore"
import type { Industry, Difficulty, QuestionFeedback } from "@/types"

interface QuestionData {
  questionId: number
  question: string
  userAnswer: string
  feedback?: QuestionFeedback
  duration: number
  createdAt: Date
}

interface SessionData {
  _id: string
  industry: Industry
  difficulty: Difficulty
  status: "in_progress" | "completed"
  questions: QuestionData[]
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

export async function createSession(industry: Industry, difficulty: Difficulty, firstQuestion: string): Promise<string> {
  if (await checkMongo()) {
    const session = await MongoSession.create({
      industry, difficulty,
      status: "in_progress",
      questions: [{ questionId: 1, question: firstQuestion, userAnswer: "", duration: 0, createdAt: new Date() }],
    })
    return session._id.toString()
  }

  const mem = getMemStore()
  const now = new Date()
  const doc = await mem.sessions.create({
    industry, difficulty,
    status: "in_progress",
    questions: [{ questionId: 1, question: firstQuestion, userAnswer: "", duration: 0, createdAt: now }],
    createdAt: now, updatedAt: now,
  })
  return doc._id as string
}

export async function getSession(id: string): Promise<SessionData | null> {
  if (await checkMongo()) {
    const s = await MongoSession.findById(id).lean()
    if (!s) return null
    return { ...s, _id: s._id.toString() } as unknown as SessionData
  }

  const mem = getMemStore()
  const doc = await mem.sessions.findById(id)
  if (!doc) return null
  return doc as unknown as SessionData
}

export async function updateQuestion(
  sessionId: string, questionId: number,
  answer: string, feedback: QuestionFeedback
) {
  if (await checkMongo()) {
    const session = await MongoSession.findById(sessionId)
    if (!session) return
    const q = session.questions.find((q: QuestionData) => q.questionId === questionId)
    if (!q) return
    q.userAnswer = answer
    q.feedback = feedback
    await session.save()
    return
  }

  const mem = getMemStore()
  const doc = await mem.sessions.findById(sessionId)
  if (!doc) return
  const questions = doc.questions as unknown as QuestionData[]
  const q = questions.find((q: QuestionData) => q.questionId === questionId)
  if (!q) return
  q.userAnswer = answer
  q.feedback = feedback
  mem.sessions.save(doc)
}

export async function pushQuestion(sessionId: string, q: QuestionData) {
  if (await checkMongo()) {
    const session = await MongoSession.findById(sessionId)
    if (!session) return
    session.questions.push(q as IQuestion)
    await session.save()
    return
  }

  const mem = getMemStore()
  const doc = await mem.sessions.findById(sessionId)
  if (!doc) return
  const questions = doc.questions as unknown as QuestionData[]
  questions.push(q)
  doc.questions = questions as unknown as QuestionData[]
  mem.sessions.save(doc)
}

export async function completeSession(sessionId: string) {
  if (await checkMongo()) {
    const session = await MongoSession.findById(sessionId)
    if (!session) return
    session.status = "completed"
    await session.save()
    return
  }

  const mem = getMemStore()
  const doc = await mem.sessions.findById(sessionId)
  if (!doc) return
  doc.status = "completed"
  mem.sessions.save(doc)
}

export async function listSessions(): Promise<SessionData[]> {
  if (await checkMongo()) {
    const sessions = await MongoSession.find({ status: "completed" }).sort({ createdAt: -1 }).lean()
    return sessions.map((s) => ({ ...s, _id: s._id.toString() } as unknown as SessionData))
  }

  const mem = getMemStore()
  const docs = await mem.sessions.find({ status: "completed" })
  return docs.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()) as unknown as SessionData[]
}
