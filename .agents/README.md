# Custom Agents

This project defines local custom agents for Codex in `.agents/*.toml`.

Agents:
- `silvio`: read-focused explorer for code discovery, dependency tracing, and concise findings
- `christopher`: write-scoped worker for implementation tasks in explicitly assigned files

Notes:
- `nickname_candidates` only affect display names in the UI.
- Agent behavior is defined by `developer_instructions`.
- Keep write boundaries explicit when assigning implementation work to `christopher`.
