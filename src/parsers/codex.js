import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { aggregateToBuckets } from './index.js';

const SESSIONS_DIR = join(homedir(), '.codex', 'sessions');

export async function parse(lastSync) {
  if (!existsSync(SESSIONS_DIR)) return [];

  const entries = [];
  let files;
  try {
    files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.jsonl'));
  } catch {
    return [];
  }

  for (const file of files) {
    const filePath = join(SESSIONS_DIR, file);
    if (lastSync) {
      try {
        const stat = statSync(filePath);
        if (stat.mtime <= new Date(lastSync)) continue;
      } catch {
        continue;
      }
    }

    const project = basename(file, '.jsonl');

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


        if (obj.type !== 'event_msg') continue;

        const payload = obj.payload;
        if (!payload || payload.type !== 'token_count') continue;

        const info = payload.info;
        if (!info) continue;

        const timestamp = obj.timestamp ? new Date(obj.timestamp) : null;
        if (!timestamp || isNaN(timestamp.getTime())) continue;
        if (lastSync && timestamp <= new Date(lastSync)) continue;


        const usage = info.last_token_usage || info.total_token_usage;
        if (!usage) continue;

        const model = info.model || payload.model || 'unknown';

        entries.push({
          source: 'codex',
          model,
          project,
          timestamp,
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          cachedInputTokens: usage.cached_input_tokens || usage.cache_read_input_tokens || 0,
          reasoningOutputTokens: usage.reasoning_output_tokens || 0,
        });
      } catch {
        continue;
      }
    }
  }

  return aggregateToBuckets(entries);
}
