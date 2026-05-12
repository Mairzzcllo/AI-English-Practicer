import { NextRequest, NextResponse } from "next/server"
import {
  getTelemetrySummary,
  getPipelineLatency,
  getMutationRuleFires,
  getMemoryVolumes,
  getStateChanges,
  resetTelemetry,
} from "@/lib/ai/persona/telemetry"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")
  const detail = searchParams.get("detail")

  const summary = getTelemetrySummary()

  if (detail === "latency") {
    return NextResponse.json({ summary, records: getPipelineLatency(sessionId ?? undefined) })
  }
  if (detail === "mutations") {
    return NextResponse.json({ summary, records: getMutationRuleFires(sessionId ?? undefined) })
  }
  if (detail === "memory") {
    return NextResponse.json({ summary, records: getMemoryVolumes(sessionId ?? undefined) })
  }
  if (detail === "stateChanges") {
    return NextResponse.json({ summary, records: getStateChanges(sessionId ?? undefined) })
  }

  return NextResponse.json({ summary })
}

export async function DELETE() {
  resetTelemetry()
  return NextResponse.json({ ok: true })
}
