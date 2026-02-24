import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { aggregateToBuckets } from './index.js';

const DATA_DIR = join(homedir(), '.local', 'share', 'opencode');
const MESSAGES_DIR = join(DATA_DIR, 'storage', 'message');

export async function parse(lastSync) {
  if (!existsSync(MESSAGES_DIR)) return [];

  const entries = [];
  let sessionDirs;
  try {
    sessionDirs = readdirSync(MESSAGES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('ses_'));
  } catch {
    return [];
  }

  for (const sessionDir of sessionDirs) {
    const sessionPath = join(MESSAGES_DIR, sessionDir.name);
    let msgFiles;
    try {
      msgFiles = readdirSync(sessionPath).filter(f => f.endsWith('.json'));
    } catch {
      continue;
    }

    for (const file of msgFiles) {
      const filePath = join(sessionPath, file);
      if (lastSync) {
        try {
          const stat = statSync(filePath);
          if (stat.mtime <= new Date(lastSync)) continue;
        } catch {
          continue;
        }
      }

      let data;
      try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch {
        continue;
      }


      if (!data.modelID) continue;


      const tokens = data.tokens;
      if (!tokens) continue;
      if (!tokens.input && !tokens.output) continue;

      const timestamp = new Date(data.time?.created);
      if (isNaN(timestamp.getTime())) continue;
      if (lastSync && timestamp <= new Date(lastSync)) continue;


      const rootPath = data.path?.root;
      const project = rootPath ? basename(rootPath) : 'unknown';

      entries.push({
        source: 'opencode',
        model: data.modelID || 'unknown',
        project,
        timestamp,
        inputTokens: tokens.input || 0,
        outputTokens: tokens.output || 0,
        cachedInputTokens: tokens.cache?.read || 0,
        reasoningOutputTokens: tokens.reasoning || 0,
      });
    }
  }

  return aggregateToBuckets(entries);
}
