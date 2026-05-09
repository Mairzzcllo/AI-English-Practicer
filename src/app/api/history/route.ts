import { NextResponse } from "next/server"
import { listSessions } from "@/lib/store"

export async function GET() {
  try {
    const sessions = await listSessions()
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Failed to fetch history:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
