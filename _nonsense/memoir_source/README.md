# Memoir.ai

> **A local-first system to ingest social media history, organize it into a timeline, and use AI to draft a personal memoir.**

## Features
*   **Ingestion**: Import Facebook/Instagram zip exports (JSON/HTML).
*   **Timeline**: Visual chronological view of your digital history.
*   **RAG/Semantic Search**: "Find memories about hiking in 2015".
*   **AI Drafting**: Collaborative editor to turn evidence into narrative.
*   **Dashboard**: Analytics on your writing progress and evidence collection.

## Quickstart

### Requirements
*   **Python**: 3.10+ (Tested on 3.14)
*   **Node.js**: 18+ (Verified with 22)
*   **API Keys**: OpenAI Key (optional, for AI Drafting features)

### Setup
```bash
# 1. Install Backend
pip install -r requirements.txt

# 2. Install Frontend
cd frontend
npm install
cd ..
```

### Run
**Backend** (Terminal 1):
```bash
python3 autobiography_engine/app.py
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```
Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Documentation
*   [**Runbook**](docs/01_RUNBOOK.md): Detailed Golden Path, Troubleshooting, and Do's/Don'ts.
*   [**Repo Snapshot**](docs/00_REPO_SNAPSHOT.md): Technical stack & Architecture overview.

## Project Structure
*   `autobiography_engine/`: Flask API & RAG Logic.
*   `frontend/`: React + Vite SPA.
*   `data/`: Local database (SQLite) and Vector Store (Chroma).
*   `scripts/`: Utility scripts.

## License
MIT
