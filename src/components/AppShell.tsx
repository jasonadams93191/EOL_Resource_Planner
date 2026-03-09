'use client'
import Link from 'next/link'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <header className="h-12 flex items-center gap-6 px-6 bg-white border-b border-gray-200 shrink-0">
        <Link href="/" className="font-semibold text-sm text-gray-900 hover:text-indigo-600 transition-colors">
          AA / EOL Capacity Planner
        </Link>
        <span className="text-gray-200">|</span>
        <Link href="/team" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Resources →
        </Link>
        <Link href="/scenarios" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Scenarios →
        </Link>
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Projects →
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
