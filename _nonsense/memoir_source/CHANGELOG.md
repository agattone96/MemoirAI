# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-22
### Added
- **Ingestion V2**: Hardened import pipeline with Pydantic schemas and Idempotency.
- **Dead Letter Queue**: Robust error handling for malformed messages.
- **Draft Persistence**: Save/Load functionality in Editor.
- **Dashboard V2**: Live stats from backend API.

### Changed
- Refactored `ingestion_engine.py` to use `messages` table with content hashing.

### Fixed
- Pydantic/ChromaDB version conflict (Standardized on Pydantic v1.10).
