'use client'

interface StatusCardProps {
  title: string
  value: string | number
  subtitle?: string
  status?: 'active' | 'on-hold' | 'done' | 'blocked' | 'neutral'
  href?: string
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  done: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-700',
}

export function StatusCard({ title, value, subtitle, status = 'neutral', href }: StatusCardProps) {
  const card = (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {status && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status]}`}>
            {status}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )

  if (href) {
    return <a href={href} className="block">{card}</a>
  }
  return card
}
