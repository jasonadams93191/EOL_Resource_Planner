import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/AppShell'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'AA / EOL Capacity Planner',
  description: 'Internal capacity planning tool for EOL Tech Team and AA/TKO Projects',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.variable}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
