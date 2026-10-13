# Diagram Design Mobile MCP

ChatGPT mobile stateless Streamable-HTTP MCP for SVG/HTML diagrams, inspired by the MIT-licensed [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design).

Tools: `diagram_status`, `diagram_render`, `diagram_validate_svg`. Offline rendering, no external URLs, no diagram persistence. Input: 1-24 nodes, 0-48 links; output: SVG and self-contained HTML. It is a small independent adapter, not the upstream full 45-diagram implementation.

Run locally using `docker build -t diagram-mobile .` and `docker run -p 8000:8000 diagram-mobile`; connect HTTPS hosting at `/mcp`. Do not submit secrets or confidential documents without authenticated hosting. Source is on an isolated feature branch, not merged to main.
