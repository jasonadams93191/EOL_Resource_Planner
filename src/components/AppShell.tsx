'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Planning',  href: '/' },
  { label: 'Resources', href: '/team' },
  { label: 'Scenarios', href: '/scenarios' },
  { label: 'Projects',  href: '/projects' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fc]">
      <header className="h-14 flex items-center bg-[#1a2e6b] shrink-0 px-6 shadow-md">
        {/* Brand */}
        <Link href="/" className="font-bold text-sm text-white hover:text-[#f28c28] transition-colors mr-8 shrink-0 tracking-wide">
          EOL Capacity Planner
        </Link>

        {/* Centered tabs */}
        <nav className="flex-1 flex justify-center">
          <div className="flex items-center">
            {NAV.map(({ label, href }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-5 h-14 flex items-center text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-[#f28c28] text-white'
                      : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
