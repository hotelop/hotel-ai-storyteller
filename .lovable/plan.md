
# AI Agents Page Implementation Plan

## Overview
Create a dedicated **Agents** page that provides a comprehensive view of all AI agents, their status, activity logs, performance metrics, and configuration. The "AI Agents Active" section in the sidebar will become a clickable link navigating to this new page.

---

## Changes Required

### 1. Create New Agents Page
**File:** `src/pages/Agents.tsx`

The page will include:

**Header Section**
- Title: "AI Agents"
- Subtitle: "Monitor and manage your autonomous AI agents"

**Agent Overview Cards (4 agents)**
Each agent card displays:
- Agent name and description
- Status indicator (Active/Paused/Error)
- Toggle switch to enable/disable
- Key metrics (tasks completed, success rate)
- "View Details" button

The 4 agents:
| Agent | Description | Icon Color |
|-------|-------------|------------|
| Review Reply Agent | Auto-generate review responses | Warning (amber) |
| Social Posting Agent | Generate and schedule posts | Info (blue) |
| Messaging Agent | Handle guest inquiries | Success (green) |
| Campaign Agent | Create seasonal campaigns | Accent (gold) |

**Activity Log Section**
- Real-time feed of recent agent actions
- Timestamp, agent name, action description
- Status badges (completed, pending, failed)

**Performance Metrics**
- Tasks completed today
- Average response time
- Success rate percentage
- Time saved (hours)

**Quick Actions Panel**
- Pause All Agents button
- Run Manual Sync button
- View Activity History link

---

### 2. Update Sidebar Navigation
**File:** `src/components/layout/Sidebar.tsx`

Changes:
- Wrap the "AI Agents Active" section in a `NavLink` component
- Navigate to `/agents` when clicked
- Add hover effect and active state styling
- Apply the same active indicator used for other nav items
- Pass `onNavClick` for mobile menu to close on navigation

---

### 3. Add Route Configuration
**File:** `src/App.tsx`

Changes:
- Import the new `Agents` component
- Add route: `<Route path="/agents" element={<Agents />} />`

---

## Technical Details

### Agent Data Structure
```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "error";
  enabled: boolean;
  iconColor: string;
  metrics: {
    tasksToday: number;
    successRate: number;
    avgResponseTime: string;
  };
}
```

### Activity Log Entry Structure
```typescript
interface ActivityEntry {
  id: string;
  agentName: string;
  action: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}
```

### Sidebar Link Styling
The clickable agent status box will:
- Use `NavLink` from react-router-dom
- Apply `cursor-pointer` and hover states
- Show active state when on `/agents` route
- Maintain collapsed/expanded behavior

---

## UI Layout

```text
+------------------------------------------+
| Header: AI Agents                        |
+------------------------------------------+
| [Stats Row: 4 metric cards]              |
|  - Active Agents    - Tasks Today        |
|  - Success Rate     - Time Saved         |
+------------------------------------------+
| Agent Cards Grid (2x2 on desktop)        |
| +----------------+ +----------------+    |
| | Review Reply   | | Social Posting |    |
| | Agent          | | Agent          |    |
| +----------------+ +----------------+    |
| +----------------+ +----------------+    |
| | Messaging      | | Campaign       |    |
| | Agent          | | Agent          |    |
| +----------------+ +----------------+    |
+------------------------------------------+
| Activity Log                             |
| - Recent agent actions with timestamps   |
+------------------------------------------+
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Agents.tsx` | Create |
| `src/components/layout/Sidebar.tsx` | Modify |
| `src/App.tsx` | Modify |

---

## Design Consistency
- Use existing `Header` component for page title
- Follow `StatCard` pattern for metrics display
- Use Framer Motion animations matching other pages
- Apply the same card styling (`bg-card rounded-xl border border-border`)
- Maintain color scheme: warning (amber), info (blue), success (green), accent (gold)
