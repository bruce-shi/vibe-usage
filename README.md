# vibe-usage

Track your AI coding tool token usage and sync to [vibecafe.ai](https://vibecafe.ai).

## Quick Start

```bash
npx vibe-usage
```

This will:
1. Ask for your API key (get one at https://vibecafe.ai/usage/setup)
2. Detect installed AI coding tools
3. Install session-end hooks for automatic syncing
4. Run an initial sync of your usage data

## Commands

```bash
npx vibe-usage          # Init (first run) or sync (subsequent runs)
npx vibe-usage init     # Re-run setup
npx vibe-usage sync     # Manual sync
npx vibe-usage status   # Show config & detected tools
```

## Supported Tools

| Tool | Auto-sync | Data Location |
|------|-----------|---------------|
| Claude Code | Yes (session hook) | `~/.claude/projects/` |
| Codex CLI | Yes (notify hook) | `~/.codex/sessions/` |
| Gemini CLI | Yes (session hook) | `~/.gemini/tmp/` |
| OpenCode | Manual only | `~/.local/share/opencode/` |
| OpenClaw | Manual only | `~/.openclaw/agents/` |

## How It Works

- Parses local session logs from each AI coding tool
- Aggregates token usage into 30-minute buckets
- Uploads to your vibecafe.ai dashboard
- Only syncs new data since last sync (incremental)

## Config

Config stored at `~/.vibe-usage/config.json`. Contains your API key and last sync timestamp.

## License

MIT
