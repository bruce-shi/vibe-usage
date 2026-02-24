import { loadConfig, saveConfig } from './config.js';
import { ingest } from './api.js';
import { parsers } from './parsers/index.js';

export async function runSync() {
  const config = loadConfig();
  if (!config?.apiKey) {
    console.error('Not configured. Run `npx vibe-usage init` first.');
    process.exit(1);
  }

  const lastSync = config.lastSync || null;
  const allBuckets = [];

  for (const [source, parse] of Object.entries(parsers)) {
    try {
      const buckets = await parse(lastSync);
      if (buckets.length > 0) {
        allBuckets.push(...buckets);
      }
    } catch (err) {
      process.stderr.write(`warn: ${source} parser failed: ${err.message}\n`);
    }
  }

  if (allBuckets.length === 0) {
    console.log('No new usage data found.');
    return 0;
  }

  try {
    const result = await ingest(
      config.apiUrl || 'https://vibecafe.ai',
      config.apiKey,
      allBuckets
    );
    config.lastSync = new Date().toISOString();
    saveConfig(config);
    console.log(`Synced ${result.ingested ?? allBuckets.length} buckets.`);
    return result.ingested ?? allBuckets.length;
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      console.error('Invalid API key. Run `npx vibe-usage init` to reconfigure.');
      process.exit(1);
    }
    console.error(`Sync failed: ${err.message}`);
    process.exit(1);
  }
}
