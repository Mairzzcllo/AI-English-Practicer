export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass rounded-2xl p-4 animate-pulse h-20" />
      ))}
    </>
  )
}
