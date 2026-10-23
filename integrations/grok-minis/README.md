# Grok ↔ Minis iPhone MCP: read-only preflight

**Status: draft; no production deployment or iPhone device action.**

## Verified on 2026-10-24 (KST)

- Google Drive khs0927@gmail.com authenticated and 지침 folder readable.
- Minis private n8n health: HTTP 200, ok=true; workflow list: 0; dispatcher call: HTTP 404 (not operational).
- HTTPS POST to https://hailee-aerodynamic-vanesa.ngrok-free.dev/mcp with ngrok warning-skip header, no Bearer token: HTTP 401 unauthorized. This confirms that the endpoint is reachable and authentication is enforced, not that 29 tools work.
- The separate servers/go-ios-control stdio adapter in this repository lacks physical-iPhone E2E verification.

## Safe test

Prerequisites: Node.js >= 20, and a Minis Bearer token already securely injected from your credential manager into environment variable MINIS_MCP_BEARER_TOKEN. Do not copy the token into chat, shell arguments, GitHub Actions output, docs, URL, or source control.

Run at the authorized runtime:

    node integrations/grok-minis/probe.mjs

Optional MINIS_MCP_URL can set a clean HTTPS /mcp address. The probe sends only MCP initialize, notifications/initialized, tools/list. It accepts JSON/SSE, propagates session ID, rejects redirects, sets the ngrok browser-warning bypass header, and prints names/count without tool-call parameters. It never executes a device tool. No token = no network request.

Unit tests:

    node --test integrations/grok-minis/probe.test.mjs

Tests are mocks; passing them does not establish authenticated remote access or real iPhone control.

## Grok configuration checklist

1. Sign in to https://grok.com/connectors under the intended user. On iOS: Settings → Connectors.
2. Add New Connector → Custom; enter HTTPS Minis MCP address and complete authentication through the supported secure UI. Confirm whether the app offers arbitrary Bearer header authentication; do not assume it.
3. Restrict to verified read-only tools. Do not enable HealthKit, HomeKit, location or unrestricted device mutations initially.
4. Test normal Grok text chat MCP tool discovery first; independently confirm actual tool count and names.
5. Test Grok app voice separately. Web/iOS connector support does not prove custom MCP tool calling from voice mode.
6. If app voice cannot use MCP, separate Speech-to-Speech API supports remote MCP, but is billable and must stay disabled without explicit action-specific authorization.
7. For state mutations: user confirmation, granular allowlist, idempotency, sanitized audit IDs, independent readback.
8. iOS background suspension interrupts local hosting; a healthy ngrok/Cloudflare proxy cannot keep a suspended iPhone process running.

## Operating limits

- Do not build an unauthenticated Cloudflare proxy.
- Do not collect or publish secrets via chat or the Drive 지침 folder.
- No production deploy, merge, billing, permissions or secret changes without authorization.
- Blockers: bearer-backed MCP initialize and tools/list, Grok signed-in connector session, n8n dispatcher HTTP 404.

Official docs: https://docs.x.ai/grok/connectors · https://docs.x.ai/developers/tools/remote-mcp · https://docs.x.ai/developers/model-capabilities/audio/speech-to-speech
