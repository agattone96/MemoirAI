# Contributing

## Getting Started
1. Read the [Runbook](docs/01_RUNBOOK.md) to set up your environment.
2. Check `docs/00_REPO_SNAPSHOT.md` to understand the stack.

## Pull Request Process
1. Ensure all local tests pass:
   ```bash
   python3 verify_ingest_v2.py
   npm run build --prefix frontend
   ```
2. Update `CHANGELOG.md` with your changes.
3. If changing API, ensure `autobiography_engine/schemas.py` is updated.

## Style Guide
- **Python**: Follow PEP8. Use Pydantic models for data structures.
- **Frontend**: Functional React components. Use Tailwind for styling.
