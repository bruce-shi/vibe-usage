import { loadSessionData } from 'ccusage/data-loader';
import { aggregateToBuckets } from './index.js';

export async function parse(lastSync) {
  let sessions;
  try {
    sessions = await loadSessionData({ mode: 'display' });
  } catch {
    return [];
  }

  if (!sessions || sessions.length === 0) return [];

  const entries = [];

  for (const session of sessions) {
    if (lastSync && new Date(session.lastActivity) <= new Date(lastSync)) continue;

    for (const breakdown of session.modelBreakdowns || []) {
      entries.push({
        source: 'claude-code',
        model: breakdown.modelName,
        project: stripSessionId(session.projectPath),
        timestamp: new Date(session.lastActivity),
        inputTokens: breakdown.inputTokens,
        outputTokens: breakdown.outputTokens,
        cachedInputTokens: breakdown.cacheReadTokens,
        reasoningOutputTokens: 0,
      });
    }
  }

  return aggregateToBuckets(entries);
}

/**
 * Strip session UUID suffix from ccusage project path.
 * ccusage returns paths like '-Users-foo-project/77e854f9-...' for subagent sessions.
 * We only keep the directory name part before the first '/'.
 */
function stripSessionId(raw) {
  if (!raw || raw === 'unknown' || raw === 'Unknown Project') return 'unknown';
  const slashIdx = raw.indexOf('/');
  if (slashIdx !== -1) return raw.slice(0, slashIdx);
  return raw;
}
