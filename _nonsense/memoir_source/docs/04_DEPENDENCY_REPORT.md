# 04_DEPENDENCY_REPORT

## Dependency & Diet Analysis (2026-01-16)

### 1. Python (Backend)
**Constraint**: `chromadb` (v0.3.x) requires `pydantic < 2.0`.
*   **Impact**: We are locked to Pydantic v1.10.
*   **Heavy Hitters**:
    *   `chromadb`: ~Large install size (includes onnxruntime, tokenizers).
    *   `sentence-transformers`: Downloads huge models (~500MB+) to `~/.cache`.
    *   `flask`: Lightweight.
*   **Recommendation**:
    *   **Keep**: `chromadb` is core to the RAG mission.
    *   **Monitor**: `pydantic` version. As soon as Chroma updates, migrate to v2 for performance/validation benefits.

### 2. Node/Frontend
**Stack**: React 19 + Vite.
*   **Dependencies**:
    *   `@dnd-kit/*`: Modular drag-and-drop. Good choice (lightweight core).
    *   `framer-motion`: Large animation library.
        *   *Optimization*: Ensure utilizing tree-shaking (imports from `framer-motion` root usually tree-shake well). If size becomes issue, switch to `framer-motion/mini` entrypoint.
    *   `lucide-react`: SVG Icons. Good choice (tree-shakeable).
    *   `date-fns`: Modular date utility. Good choice (better than moment.js).
*   **DevDependencies**:
    *   Standard `vite`, `typescript`, `eslint`. No bloat detected.

### 3. Cleanup List (Immediate)
*   **Unused**:
    *   (Backend) `beautifulsoup4`: *Correction* - Used by Ingestion Engine. KEEP.
    *   (Backend) `python-dotenv`: Check if actually used (`load_dotenv` call).
*   **Duplicates**: None detected.

### 4. Verdict
**Healthy**. The dependency footprint is reasonable for a RAG + Dashboard application. The primary weight comes from the "Intelligence" (AI/Vector) components, which is expected.
