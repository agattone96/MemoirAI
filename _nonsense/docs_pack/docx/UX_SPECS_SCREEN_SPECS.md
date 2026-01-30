# Memoir.ai — UX_SPECS / SCREEN_SPECS

This document defines implementation‑grade UX specifications for screens previously lacking granular detail. It covers component inventories, interaction states, transitions, and routing implications required for engineering execution.

---

## Global UX Conventions

### Layout Zones
All screens follow the standard shell:

- Left Sidebar Navigation
- Top Context Bar
- Main Content Workspace
- Optional Right Inspector Panel
- Modal Layer for destructive or blocking flows
- Toast/Notification Layer

### Standard UI States
Each screen must support:

- Loading
- Empty
- Error (recoverable)
- Error (fatal)
- Success confirmation
- Background processing indicator
- Offline or locked vault state

### Animation Rules ("Nebula" Motion Language)
Animations must remain subtle and calm.

Patterns:
- Soft opacity fades (150–250ms)
- Slight vertical elevation on entry (4–8px)
- Timeline alignment pulse for completed operations
- Non-blocking shimmer for loading content
- Avoid rapid motion or bright flashes

Motion should never delay task completion.

---

## SCREEN: BILLING

### Purpose
Manage subscription, payment methods, invoices, and usage limits.

### Primary Components
- Plan Summary Card
- Current Tier Indicator
- Upgrade/Downgrade Options
- Usage Metrics Panel
- Payment Method Manager
- Invoice History Table
- Subscription Cancellation Panel
- Trial Status Indicator
- Renewal Countdown Indicator

### Interaction Flows

#### Upgrade Flow
1. User selects plan.
2. Plan comparison modal opens.
3. User confirms selection.
4. Payment method validated.
5. Confirmation displayed.
6. Limits updated live.

#### Cancellation Flow
1. User clicks cancel subscription.
2. Confirmation modal with retention messaging.
3. User confirms cancellation.
4. Subscription remains active until billing end.
5. UI reflects pending cancellation.

### States

Loading:
- Skeleton cards for plans.
- Placeholder invoice list.

Empty:
- No invoices message.
- No payment method warning.

Error:
- Payment failure alert.
- Retry payment action.

Success:
- Toast confirmation after payment update.

---

## SCREEN: SETTINGS

### Purpose
Manage vault configuration, privacy, imports, and preferences.

### Tabs

1. General
2. Vault & Storage
3. Imports
4. Privacy & Security
5. Snapshots Preferences
6. Advanced Diagnostics
7. Keyboard Shortcuts

### Component Breakdown

General:
- Theme toggle
- Default landing screen selector
- Notification preferences

Vault & Storage:
- Vault path display
- Move vault action
- Storage usage visualization
- Export vault data
- Delete vault data

Imports:
- Default import folders
- Auto-deduplication toggle
- Parser performance mode

Privacy & Security:
- Passphrase change flow
- Vault lock timeout setting
- Local analytics toggle

Snapshots Preferences:
- Default narrative tone
- Summary length preference
- Auto-citation toggle

Advanced Diagnostics:
- Logs viewer
- Rebuild index action
- Repair vault action

Keyboard Shortcuts:
- Shortcut viewer
- Custom mapping

### States

Loading:
- Tab-level skeleton loaders.

Error:
- Vault path inaccessible warning.
- Index repair suggestion.

Success:
- Toast confirmation after settings save.

---

## SCREEN: SNAPSHOTS

### Purpose
Generate, manage, and refine narrative outputs.

### Primary Components
- Snapshot List Panel
- Snapshot Preview Panel
- Source Event Selector
- Version History Viewer
- Regenerate Snapshot Button
- Citation Viewer
- Edit Draft Panel
- Export Snapshot Controls

### Interaction Flow

Snapshot Creation:
1. User selects events or time range.
2. Snapshot generation job begins.
3. Progress indicator shown.
4. Draft appears in preview.
5. User edits or approves.

Regeneration:
1. User triggers regenerate.
2. Previous version archived.
3. New version replaces preview.

Version Navigation:
- Users can revert to previous versions.
- Version diffs shown inline.

### States

Loading:
- Placeholder narrative blocks.

Empty:
- No snapshots created message.

Error:
- Generation failure with retry option.

Success:
- Snapshot created toast confirmation.

---

## ROUTE STRUCTURE

### Core Routes

/app
/app/timeline
/app/imports
/app/snapshots
/app/settings
/app/billing
/app/jobs

### Nested Routes

/app/snapshots/:snapshotId
/app/timeline/event/:eventId
/app/settings/:tab

### Parameters
- snapshotId
- eventId
- tab
- sourceId

Deep links must restore scroll and selection state.

---

## Accessibility Requirements

- Full keyboard navigation
- Screen reader labeling
- Minimum AA contrast ratios
- Focus states for all interactive elements

---

## Error Handling Philosophy

Errors must always provide:
1. Explanation
2. Recovery action
3. Non-destructive fallback

Never leave user in a blocked state.

---

## Completion Criteria

UX_SPECS considered complete when:
- All screens support loading, empty, error, and success states.
- Navigation routes map to functional screens.
- Motion guidelines consistently applied.
- Settings and billing flows validated.

---