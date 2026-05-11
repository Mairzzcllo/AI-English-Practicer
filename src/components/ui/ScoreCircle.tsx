type Props = {
  score: number
  size?: "lg" | "sm"
}

export function ScoreCircle({ score, size = "lg" }: Props) {
  const dim = size === "lg"
    ? "w-24 h-24 text-3xl shadow-lg"
    : "w-16 h-16 text-xl shadow-sm"

  return (
    <>
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold ${dim} mb-3`}
      >
        {Math.round(score)}
      </div>
      <div className="text-xs text-zinc-400">/100</div>
    </>
  )
}
