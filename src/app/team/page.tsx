'use client'

import { useState } from 'react'
import { TeamView } from '@/components/planning/TeamView'
import { ObjectTypeFilter } from '@/components/ObjectTypeFilter'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'

export default function TeamPage() {
  const [search, setSearch] = useState('')

  const filteredMembers = TEAM_MEMBERS.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Team</h2>
        <p className="text-sm text-gray-500 mt-1">Resource roster, capacity, and skills</p>
      </div>

      <ObjectTypeFilter
        objectType="resources"
        onObjectTypeChange={() => {}}
        available={['resources']}
        search={search}
        onSearchChange={setSearch}
      />

      <TeamView
        members={filteredMembers}
        roles={ROLES}
        skills={SKILLS}
        linkHref={(m) => `/team/${m.id}`}
      />
    </div>
  )
}
