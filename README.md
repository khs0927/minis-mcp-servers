# Minis MCP Servers — Native iOS Bridge for AI Agents

**Five Model Context Protocol (MCP) servers bridging LLMs to native iOS functionality. From Shortcuts creation to HealthKit analysis, from Gemini Spark connection to full-spectrum orchestration.**

These servers expose iPhone capabilities — Shortcuts, Health, Reminders, Calendar, Vision, device automation — as standard MCP tools so any LLM client can interact with them.

---

## Server Catalog

| Server | Transport | Tools | Key Feature |
|--------|-----------|-------|-------------|
| `ios-shortcuts` | stdio | `list_actions`, `validate_shortcut` | Create iOS Shortcuts from natural language |
| `complete-agent` | stdio | `plan`, `status`, `verify`, `trace` | Evidence-gated mission execution |
| `hermes` | stdio | `hermes_orchestrate`, `hermes_chat`, `hermes_roles` | Korean sub-agent orchestration |
| `orchestrator` | stdio | `call_orchestrator` | Legacy compatibility bridge |
| `khs0927` | HTTP (Smithery) | 100 tools across 9 servers | Universal data toolbox |

---

## ios-shortcuts MCP Server

Automate iOS Shortcuts creation through LLM. Translates natural language into Shortcuts actions → validates structure → returns import-ready recipe.

```
"I want to wake up to my favorite playlist" 
    → shortcut: alarm trigger → open player → play playlist
```

**Status**: SAFE_MODE (no shell/run). macOS `shortcuts` CLI needed for sign/import — not available on iSH, but `list_actions` and `validate` work anywhere.

---

## complete-agent MCP Server

**Evidence-gated mission orchestration.** Designed for Minis, but usable by any LLMCP client.

| Tool | Description |
|------|-------------|
| `complete_agent_plan` | Compiles a typed mission with workstream classification, plugin dispatch, & model routing |
| `complete_agent_status` | Environment audit (plugins, MCP servers, Apple tools, skills, provider status) |
| `complete_agent_verify` | Applies evidence gate criteria (must reach ≥ 0.82 score per workstream type) |
| `complete_agent_trace` | Hash-based redacted execution trace — no secrets |

---

## Hermes MCP Server

**Korean-language sub-agent orchestrator** — translates natural language requests into parallel worker dispatch.

| Tool | Description |
|------|-------------|
| `hermes_orchestrate` | Decompose prompt → planner selects agents → fetch-agent / coder-agent / sys-agent work → reviewer synthesizes → final Korean report |
| `hermes_chat` | Direct call to any sub-agent role with scope |
| `hermes_roles` | List and query role configurations |
| `hermes_verify_opus` | Claude Opus-5 independent verification |
| `hermes_list_models` | 86 NVIDIA NIM chat model catalog |

### Sub-Agent Roles

```
planner →     "task decomposition, order, scope"
sys-agent →   "iOS/Minis: device, files, alarms, calendar"
coder-agent → "code, test, debug, refactor"
fetch-agent → "web, browser, archive, citations"
reviewer →    "independent fact check, synthesis in Korean"
```

### Orchestration Flow

```
User prompt (Korean)
  │
  ├→ planner: decompose into work items
  ├→ sys-agent + coder-agent + fetch-agent (parallel, independent)
  └→ reviewer
       ├─ fact-check each work item
       ├─ synthesize in Korean
       └─ return "검증 완료 / 검증 필요 / 실행 완료"
```

---

## Toolbox — 100 Universal Tools

The `khs0927` MCP server (via Smithery) is an integrated result hub covering:

| Domain | Tools |
|--------|-------|
| Academic | arXiv, paper-search, PubMed, bioRxiv, cross search, PDF download |
| Financial | stocks, options chain, crypto, sanctions, routes |
| Data | weather, package tracking, VIN, CVE, college, court |
| Uncertainty | Polymarket prediction market (7 tools) |
| Code sandbox | code execution in sandbox |

No separate API keys needed — host injects `SMITHERY_API_KEY` env.

---

## Apple Native Commands (20+ tools)

All Apple frameworks are accessible via `/usr/local/bin/apple-*`:

| Category | Commands |
|----------|----------|
| Health | `apple-healthkit` (100+ types), `apple-healthkit batch` |
| Vision | `apple-vision` (ocr, barcode, classify, detect, faces, similarity, overlap) |
| Productivity | `apple-reminders`, `apple-calendar`, `apple-alarm` |
| Media | `apple-photos`, `apple-player`, `apple-speak` |
| AI/ML | `apple-nlp`, `apple-vision` |
| Location | `apple-maps`, `apple-location`, `apple-nfc` |
| System Bridge | `apple-receipt`, `apple-copy`, `apple-media`, `apple-share` |

These are standard JSON-output CLIs exposed via iSH native namespace — so the Hermes `hermes_chat` handler can call them directly.

---

## Architecture Map

```
AI Client (LLM, Hermes, OpenHaus, any MCP-capable)
         │
    ────┼───────── MCP transport ─────────🚫────────
         │
         ▼
 Minis MCP Servers (stdio / HTTP)
    ├── ios-shortcuts-server (list, validate, generate)
    ├── complete-agent-server (plan, status, verify, trace)
    ├── hermes-server (orchestrate, role, verify_opus)
    ├── orchestrator-server (legacy bridge)
    └── khs0927-tools (Smithery 46+ connected)
         │
         ▼
   iOS native framework (apple-* tools)
```

## Example: Create a Shortcut via AI

```json
// User: "Create a shortcut that logs my brain to spreadsheet"
{
  "server": "ios-shortcuts",
  "tool": "generate_shortcut",
  "arguments": {
    "description": "log brain",
    "actions": [
      {"action": "healthkit.fetch", "params": {"type": "mindful_session", "scope": "today"}},
      {"action": "json.format"},
      {"action": "googledrive.send_to_sheet"}
    ]
  }
}
```

## Security

- All secrets via environment variable (never in memory/file)
- MCP config uses `$$ENV_VAR` placeholder → resolved at runtime
- No plaintext API keys in any MCP server payload
- Evidence gates prevent unsafe side effects (external writes, financial moves, publishing) without explicit user confirmation

## Prerequisites

- iOS Minis (device)
- iSH (Alpine Linux aarch64)
- Environment variables set: `NVIDIA_API_KEY`, `AEROLINK_API_KEY`, `SMITHERY_API_KEY`

## License

MIT