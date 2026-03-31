# Architecture diagrams (Mermaid source)

The `.mmd` files in this folder are the Mermaid source for the architecture diagrams used in the main README. The rendered PNGs live in `assets/`:

| Source (.mmd)                 | Rendered image (`assets/`)        |
| ----------------------------- | -------------------------------- |
| `system-architecture.mmd`     | `system-architecture.png`        |
| `scrub-and-enhance-flow.mmd` | `scrub-and-enhance-flow.png`     |

## Regenerating the PNGs

Install the Mermaid CLI (if needed):

```bash
npm install -g @mermaid-js/mermaid-cli
```

From the repo root, run the following to update the diagrams (`-b white` for white background, `--scale 4` for higher resolution). The `-c` option applies the theme from `mermaid-config.json`:

```bash
mmdc -i docs/diagrams/system-architecture.mmd -o assets/system-architecture.png -b white --scale 4 -c docs/diagrams/mermaid-config.json
mmdc -i docs/diagrams/scrub-and-enhance-flow.mmd -o assets/scrub-and-enhance-flow.png -b white --scale 4 -c docs/diagrams/mermaid-config.json
```
