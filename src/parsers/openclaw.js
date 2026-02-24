import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { aggregateToBuckets } from './index.js';

const AGENTS_DIR = join(homedir(), '.openclaw', 'agents');

export async function parse(lastSync) {
  if (!existsSync(AGENTS_DIR)) return [];

  const entries = [];
  let agentDirs;
  try {
    agentDirs = readdirSync(AGENTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());
  } catch {
    return [];
  }

  for (const agentDir of agentDirs) {
    const project = agentDir.name;
    const sessionsDir = join(AGENTS_DIR, agentDir.name, 'sessions');
    if (!existsSync(sessionsDir)) continue;

    let files;
    try {
      files = readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = join(sessionsDir, file);
      if (lastSync) {
        try {
          const stat = statSync(filePath);
          if (stat.mtime <= new Date(lastSync)) continue;
        } catch {
          continue;
        }
      }

      let content;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);

          const usage = obj.usage || obj.message?.usage;
          if (!usage) continue;

          const timestamp = obj.timestamp || obj.created_at;
          if (!timestamp) continue;
          const ts = new Date(timestamp);
          if (isNaN(ts.getTime())) continue;
          if (lastSync && ts <= new Date(lastSync)) continue;

          entries.push({
            source: 'openclaw',
            model: obj.model || obj.message?.model || 'unknown',
            project,
            timestamp: ts,
            inputTokens: usage.input_tokens || 0,
            outputTokens: usage.output_tokens || 0,
            cachedInputTokens: usage.cache_read_input_tokens || 0,
            reasoningOutputTokens: 0,
          });
        } catch {
          continue;
        }
      }
    }
  }

  return aggregateToBuckets(entries);
}
