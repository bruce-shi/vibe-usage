import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { aggregateToBuckets, extractSessions } from './index.js';

/**
 * Antigravity parser.
 * Reads JSON log files from ~/.antigravity/logs/
 */

const ANTIGRAVITY_LOGS_DIR = join(homedir(), '.antigravity', 'logs');

export async function parse() {
  const entries = [];
  const sessionEvents = [];

  if (!existsSync(ANTIGRAVITY_LOGS_DIR)) {
    return { buckets: [], sessions: [] };
  }

  const files = readdirSync(ANTIGRAVITY_LOGS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = join(ANTIGRAVITY_LOGS_DIR, file);
    const sessionId = basename(file, '.json');
    let content;
    try {
      content = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
      continue;
    }

    if (!Array.isArray(content)) continue;

    for (const item of content) {
      const ts = new Date(item.timestamp);
      if (isNaN(ts.getTime())) continue;

      sessionEvents.push({
        sessionId,
        source: 'antigravity',
        project: item.project || 'unknown',
        timestamp: ts,
        role: item.role === 'user' ? 'user' : 'assistant',
      });

      if (item.role === 'assistant' && item.usage) {
        entries.push({
          source: 'antigravity',
          model: item.model || 'unknown',
          project: item.project || 'unknown',
          timestamp: ts,
          inputTokens: item.usage.input_tokens || 0,
          outputTokens: item.usage.output_tokens || 0,
          cachedInputTokens: item.usage.cache_read_input_tokens || 0,
          reasoningOutputTokens: item.usage.reasoning_output_tokens || 0,
        });
      }
    }
  }

  return { 
    buckets: aggregateToBuckets(entries), 
    sessions: extractSessions(sessionEvents) 
  };
}
