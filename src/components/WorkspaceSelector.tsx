'use client'

export type WorkspaceFilter = 'all' | 'eol' | 'aa'

interface WorkspaceSelectorProps {
  value: WorkspaceFilter
  onChange: (value: WorkspaceFilter) => void
}

const tabs: { label: string; value: WorkspaceFilter }[] = [
  { label: 'All Workspaces', value: 'all' },
  { label: 'EOL Tech Team', value: 'eol' },
  { label: 'AA/TKO Projects', value: 'aa' },
]

export function WorkspaceSelector({ value, onChange }: WorkspaceSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            value === tab.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
