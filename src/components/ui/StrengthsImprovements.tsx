type Props = {
  strengths: string[]
  improvements: string[]
}

export function StrengthsImprovements({ strengths, improvements }: Props) {
  if (strengths.length === 0 && improvements.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {strengths.length > 0 && (
        <div className="bg-green-50/60 rounded-xl p-4 border border-green-200/50">
          <p className="text-sm font-semibold text-green-800 mb-2">Strengths</p>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-green-700">
                &#10003; {s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {improvements.length > 0 && (
        <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/50">
          <p className="text-sm font-semibold text-amber-800 mb-2">Areas to Improve</p>
          <ul className="space-y-1">
            {improvements.map((s, i) => (
              <li key={i} className="text-sm text-amber-700">
                &#8593; {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
