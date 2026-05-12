import { NextRequest, NextResponse } from "next/server"
import { createAiAdapter } from "@/lib/ai"
import { getSession, addMessage } from "@/lib/store"
import { PersonaAgent } from "@/lib/ai/persona/persona"
import { buildSystemPrompt } from "@/lib/ai/persona/prompts"
import { createDefaultPersonaConfig } from "@/lib/ai/persona/types"
import { createPersonaStore } from "@/lib/ai/persona/store"
import type { ConversationSignal } from "@/lib/ai/persona/types"

function deriveSignal(transcript: string): ConversationSignal {
  const lower = transcript.toLowerCase()
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length

  if (wordCount < 3) return { type: "short_reply", intensity: 0.5 }
  if (lower.includes("?")) return { type: "question", intensity: 0.6 }
  if (wordCount > 20) return { type: "long_reply", intensity: 0.7 }

  const positiveWords = ["love", "great", "good", "like", "wonderful", "amazing", "nice", "happy", "enjoy"]
  const negativeWords = ["hate", "bad", "terrible", "awful", "sad", "angry", "frustrat", "disappoint"]

  const hasPositive = positiveWords.some(w => lower.includes(w))
  const hasNegative = negativeWords.some(w => lower.includes(w))

  if (hasPositive && !hasNegative) return { type: "positive_sentiment", intensity: 0.6 }
  if (hasNegative) return { type: "negative_sentiment", intensity: 0.5 }

  return { type: "long_reply", intensity: 0.5 }
}

function createConversationPersona() {
  return createDefaultPersonaConfig({
    name: "Alex",
    traits: ["patient", "encouraging", "curious"],
    speakingStyle: "conversational and warm",
    baseTone: "friendly",
    background: "An experienced English tutor who loves helping learners improve through natural conversation.",
    coreValues: ["patience", "encouragement", "clarity"],
    teachingStyle: "scaffolding",
    conflictStyle: "diplomatic",
    humorStyle: "warm",
    socialBoundaries: "casual",
    initiativeBias: 0.5,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, transcript } = await req.json()

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    await addMessage(sessionId, {
      role: "user",
      content: transcript,
      createdAt: new Date(),
    })

    const conversation = [
      ...session.messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: transcript },
    ]

    let personaPrompt: string | undefined

    if (session.mode === "conversation") {
      const pstore = await createPersonaStore()
      let agent: PersonaAgent
      const configRecord = await pstore.getSession(sessionId)

      if (!configRecord) {
        const config = createConversationPersona()
        await pstore.createSession(config, sessionId)
        agent = new PersonaAgent(config)
      } else {
        agent = new PersonaAgent(configRecord.config)
        const snapshot = await pstore.getLatestSnapshot(sessionId)
        if (snapshot) {
          agent.loadState({
            runtime: snapshot.runtime,
            relationship: snapshot.relationship,
            conversation: snapshot.conversation,
            memory: snapshot.memory,
            policy: snapshot.policy,
          })
        }
      }

      const signal = deriveSignal(transcript)
      const result = agent.processTurn({ signal, userMessage: transcript, timeDeltaMinutes: 0.5, sessionId })
      const state = agent.getState()

      await pstore.saveSnapshot(sessionId, {
        sessionId,
        runtime: state.runtime,
        relationship: state.relationship,
        conversation: state.conversation,
        memory: state.memory,
        policy: state.policy,
        sequence: state.conversation.turnCount,
      })

      const memEvent = result.memoryEvent
      if (memEvent) {
        await pstore.appendEvent(sessionId, {
          type: "memory_event",
          data: { event: memEvent.event, category: memEvent.category, importance: memEvent.importance },
        })
      }

      personaPrompt = buildSystemPrompt({
        config: state.config,
        runtime: state.runtime,
        relationship: state.relationship,
        conversation: state.conversation,
        memory: state.memory,
        modulation: result.modulation,
      })
    }

    const adapter = createAiAdapter()
    const response = await adapter.generateConversationResponse(
      conversation,
      session.mode,
      session.difficulty,
      session.industry,
      session.topic,
      personaPrompt
    )

    await addMessage(sessionId, {
      role: "ai",
      content: response.content,
      createdAt: new Date(),
    })

    return NextResponse.json({
      message: { role: "ai", content: response.content },
      shouldEnd: response.shouldEnd,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to process conversation:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
