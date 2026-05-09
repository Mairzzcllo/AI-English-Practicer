import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/store"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession(id)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    return NextResponse.json({ session })
  } catch (error) {
    console.error("Failed to fetch session:", error)
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
