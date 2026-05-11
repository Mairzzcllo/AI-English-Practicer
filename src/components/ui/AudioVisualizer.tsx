"use client"

import { useRef, useEffect } from "react"

export function AudioVisualizer({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef(0)

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(animationRef.current)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let stream: MediaStream | null = null
    let audioCtx: AudioContext | null = null

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(s)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        const ctx = canvas.getContext("2d")!

        const draw = () => {
          if (cancelled) return
          animationRef.current = requestAnimationFrame(draw)
          analyser.getByteFrequencyData(dataArray)

          ctx.clearRect(0, 0, canvas.width, canvas.height)
          const barWidth = (canvas.width / bufferLength) * 2.5
          let x = 0
          for (let i = 0; i < bufferLength; i++) {
            const h = (dataArray[i] / 255) * canvas.height
            const hue = 240 - h * 3
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`
            ctx.fillRect(x, canvas.height - h, barWidth - 1, h)
            x += barWidth
          }
        }
        draw()
      })
      .catch(() => {})

    return () => {
      cancelled = true
      cancelAnimationFrame(animationRef.current)
      stream?.getTracks().forEach((t) => t.stop())
      audioCtx?.close()
    }
  }, [isActive])

  return (
    <canvas
      ref={canvasRef}
      width={100}
      height={20}
      className="rounded"
    />
  )
}
