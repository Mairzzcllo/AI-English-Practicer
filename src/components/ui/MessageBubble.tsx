type Props = {
  role: "user" | "ai"
  content: string
}

export function MessageBubble({ role, content }: Props) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          role === "user"
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm"
            : "glass"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  )
}
