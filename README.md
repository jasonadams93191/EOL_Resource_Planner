# AA / EOL Capacity Planner

An internal capacity planning tool that combines work from two Jira workspaces — **EOL Tech Team** and **AA/TKO Projects** — into a single shared capacity model for a 4-person team.

> Wave 1 — All data is mock. Wave 2 will connect live Jira workspaces.

---

## Purpose

This tool answers three key questions for the AA/EOL team:

1. **What is the team's total workload?** — Aggregated across both Jira workspaces into a single backlog view.
2. **When will projects complete?** — Given a shared resource pool, what are realistic delivery dates?
3. **What if we change staffing?** — Model scenarios like "add 1 developer" and see the impact on all project timelines.

---

## Scope

### Two Jira Workspaces

| Workspace | Projects | Jira Key |
|---|---|---|
| EOL Tech Team | Infrastructure EOL Remediation, Security Compliance | EOL |
| AA/TKO Projects | Attorney Intake Automation, TKO Matter Management | AA |

### Shared Resource Pool (4 people)

| Name | Role | Weekly Hours | Utilization |
|---|---|---|---|
| Alex Rivera | PM / Dev Hybrid | 40h | 80% |
| Jordan Kim | Developer | 40h | 85% |
| Morgan Chen | Developer | 40h | 85% |
| Casey Brown | Admin (part-time) | 20h | 70% |

---

## Architecture

```
UI Pages (Next.js App Router)
  └── Overview / Projects / Timeline / Scenarios / Settings
        │
        ├── Components
        │     AppShell · WorkspaceSelector · StatusCard
        │     TimelinePlaceholder · ScenarioComparison · AssumptionsPanel
        │
        └── API Routes (/api/health · /api/jira/issues · /api/estimate · /api/schedule)
              │
              ├── Estimation Engine   (src/lib/estimation/engine.ts)
              ├── Scheduling Engine   (src/lib/scheduling/engine.ts)
              └── Scenario Engine     (src/lib/scenarios/engine.ts)
                    │
                    ├── Mock Data Layer  (src/lib/mock/sample-data.ts)   <- Wave 1
                    │
                    └── Jira Layer       (src/lib/jira/)                 <- Wave 2
                          client.ts · normalize.ts
                                │
                                └── Jira REST API (two workspaces)      <- Wave 2
```

---

## Modules

| Path | Description |
|---|---|
| `src/types/domain.ts` | Shared TypeScript interfaces and enums for all domain objects |
| `src/lib/config.ts` | Server-side environment variable loader (never exposed to browser) |
| `src/lib/jira/client.ts` | Jira API client stub — Wave 2 target |
| `src/lib/jira/normalize.ts` | Jira API response to domain type normalizer |
| `src/lib/estimation/engine.ts` | Issue estimation engine (story points to hours) |
| `src/lib/scheduling/engine.ts` | Project scheduling engine (capacity to dates) |
| `src/lib/scenarios/engine.ts` | Scenario modeling engine (staffing changes to delta) |
| `src/lib/mock/sample-data.ts` | Realistic mock data for all domain objects |
| `src/components/AppShell.tsx` | Sidebar nav shell wrapping all pages |
| `src/components/WorkspaceSelector.tsx` | Tab control to filter by Jira workspace |
| `src/components/StatusCard.tsx` | KPI summary card with status badge |
| `src/components/TimelinePlaceholder.tsx` | Table-based timeline (Gantt chart in Wave 2) |
| `src/components/ScenarioComparison.tsx` | Side-by-side baseline vs. adjusted scenario view |
| `src/components/AssumptionsPanel.tsx` | Capacity assumption table |
| `src/app/page.tsx` | Overview dashboard with KPI cards |
| `src/app/projects/page.tsx` | Project portfolio view with workspace filter |
| `src/app/timeline/page.tsx` | Timeline and workload summary |
| `src/app/scenarios/page.tsx` | Scenario modeling page |
| `src/app/settings/page.tsx` | Capacity assumptions and Jira env var reference |

---

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your Jira credentials (Wave 2 — not needed for Wave 1 mock data)
```

### Run development server

```bash
npm run dev
# Open http://localhost:3000
```

### Other commands

```bash
npm run build       # Production build
npm run typecheck   # TypeScript type check (no emit)
npm run lint        # ESLint
npm test            # Jest tests
```

---

## Environment Variables

All variables are server-side only (set in `.env.local`, never sent to the browser).

| Variable | Description |
|---|---|
| `JIRA_EOL_BASE_URL` | EOL Tech Team Jira base URL |
| `JIRA_EOL_EMAIL` | Jira account email for EOL workspace |
| `JIRA_EOL_API_TOKEN` | Jira API token for EOL workspace |
| `JIRA_EOL_PROJECT_KEY` | Jira project key (e.g., `EOL`) |
| `JIRA_AA_BASE_URL` | AA/TKO Jira base URL |
| `JIRA_AA_EMAIL` | Jira account email for AA workspace |
| `JIRA_AA_API_TOKEN` | Jira API token for AA workspace |
| `JIRA_AA_PROJECT_KEY` | Jira project key (e.g., `AA`) |

---

## Access

- Internal tool only — no authentication in Wave 1.
- Run locally or deploy behind your organization's VPN/internal network.

---

## What Is Stubbed (Wave 2+)

All stub points are marked with `// TODO Wave 2:` comments in the source.

| Feature | Status | Wave |
|---|---|---|
| Live Jira API calls | Stubbed — throws NotImplementedError | Wave 2 |
| AI/rule-based issue estimation | Placeholder 4h/point formula | Wave 2 |
| Real critical-path scheduling | Returns static mock schedules | Wave 2 |
| Real scenario constraint solver | Applies fixed day deltas | Wave 2 |
| Gantt chart visualization | Table placeholder | Wave 2 |
| Burndown / utilization heatmap | Not yet built | Wave 3 |
| Editable capacity assumptions | Read-only table | Wave 2 |
| Jira workspace discovery UI | Static env var list | Wave 2 |
| Historical velocity calibration | Hard-coded 4h/point | Wave 3 |

---

## Wave 1 Scope Statement

Wave 1 establishes the full architectural skeleton:

- Domain model typed with TypeScript interfaces
- Jira client and normalizer stubs — wired up but not yet calling live APIs
- Estimation, scheduling, and scenario engine stubs with clear Wave 2 handoff markers
- Realistic mock data covering 2 workspaces, 4 projects, 11 epics, 23 issues, 4 team members
- Complete UI: all 5 pages rendered, workspace filter working, scenario comparison displayed
- API routes returning mock JSON (same contract Wave 2 will keep)
- Tests: health route + domain type conformance
- Lint, typecheck, build all clean
