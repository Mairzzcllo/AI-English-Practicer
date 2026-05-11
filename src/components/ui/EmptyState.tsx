export function EmptyState({
  message,
  buttonLabel,
  onAction,
}: {
  message: string
  buttonLabel: string
  onAction: () => void
}) {
  return (
    <div className="glass rounded-2xl p-12 text-center space-y-3">
      <p className="text-zinc-500">{message}</p>
      <button
        onClick={onAction}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
      >
        {buttonLabel}
      </button>
    </div>
  )
}
