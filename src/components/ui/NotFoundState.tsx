"use client"

export function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="glass rounded-2xl p-12 text-center space-y-4">
      <p className="text-zinc-500">Session not found.</p>
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
      >
        Back to history
      </button>
    </div>
  )
}
