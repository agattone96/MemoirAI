# 08_REORG_PLAN

## Structure Improvement Plan (2026-01-16)

### 1. Pain Points
*   **Flat `components/`**: `Dashboard.tsx` (a full page) sits next to small components. Hard to distinguish "Views" from "Widgets".
*   **Backend Name**: `autobiography_engine` is verbose, but renaming it breaks all imports (and habits). *Decision: Keep it, but alias it in docs as "Backend".*

### 2. Proposed Frontend Tree (Feature-Based)
Scale `frontend/` by separating "Pages" from "Components".

```text
frontend/
└── src/
    ├── components/       # Shared UI (Buttons, Cards, Inputs)
    │   └── ui/           # (Optional) Shadcn/Atomic design
    ├── pages/            # Top-Level Route Entrypoints
    │   ├── DashboardPage.tsx  <-- Was components/Dashboard.tsx
    │   ├── TimelinePage.tsx   <-- Was components/Timeline.tsx
    │   ├── DraftingPage.tsx   <-- Was components/Drafting.tsx
    │   └── MediaPage.tsx      <-- Was components/MediaGallery.tsx
    ├── features/         # Complex Logic & Domain Components
    │   ├── dashboard/    # Dashboard-specific child components
    │   ├── drafting/     # Editor, EvidenceBin, DragDrop logic
    │   └── timeline/     # EventBubble, Scroller
    ├── hooks/            # Shared Hooks (useFetch, etc)
    └── types/            # Shared Interfaces
```

### 3. Migration Steps (Incremental)

#### Phase 1: Pages Separation (Low Risk)
1.  Create `frontend/src/pages/`.
2.  Move the 4 big components from `src/components/` to `src/pages/`.
3.  Rename them (e.g. `Dashboard` -> `DashboardPage`) to clarify intent.
4.  Update `App.tsx` imports.

#### Phase 2: Feature Extraction (Medium Risk)
1.  Extract large inline components (like the "Evidence Bin" in Drafting) into `src/features/drafting/EvidenceBin.tsx`.
2.  Encourage smaller files.

### 4. Backend Recommendations
*   Keep `autobiography_engine/` as is to avoid "Import Hell".
*   Ensure all new logic goes into `_engine.py` files, not `app.py`.

### 5. Guardrails
*   **Rule 1**: `pages/` cannot import other `pages/`.
*   **Rule 2**: `features/` should be self-contained where possible.
*   **Rule 3**: `components/` must be generic (no domain logic).
