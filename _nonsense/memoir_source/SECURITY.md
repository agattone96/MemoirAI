# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 0.x | Yes |

## Reporting a Vulnerability
- Do not open a public GitHub issue for security findings.
- Report vulnerabilities to the repo owner directly.

## Dependency Policy
- We use `pydantic<2.0.0` intentionally due to downstream dependencies. Do not upgrade without verifying `chromadb` compatibility.
- Periodically run `npm audit` in `frontend/`.
