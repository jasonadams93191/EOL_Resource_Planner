import { redirect } from 'next/navigation'

// The /planning route has been superseded by the main dashboard at /.
// Initiative details are at /planning/[id].
export default function PlanningPage() {
  redirect('/')
}
