export function MicPermissionBanner({ state }: { state: PermissionState | null }) {
  if (state === "granted" || state === null) return null
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
      {state === "denied"
        ? "Microphone access is blocked. Please enable it in your browser settings (site permissions) and refresh."
        : "This app needs microphone access. Click \"Allow\" when prompted by your browser."}
    </div>
  )
}
