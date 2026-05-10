import type { Metadata } from "next"
import Link from "next/link"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "TalkEasy AI",
  description: "Practice English with AI-powered conversations",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="glass border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
TalkEasy AI
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-500">
              <Link href="/" className="hover:text-zinc-800 transition-colors">Home</Link>
              <Link href="/history" className="hover:text-zinc-800 transition-colors">History</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
