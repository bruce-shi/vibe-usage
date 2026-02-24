import { loadConfig, getConfigPath } from './config.js';
import { detectInstalledTools, TOOLS } from './hooks.js';
import { existsSync } from 'node:fs';

async function showStatus() {
  const config = loadConfig();
  console.log('\nvibe-usage status\n');

  if (!config?.apiKey) {
    console.log('  Config: not configured');
    console.log(`  Run \`npx vibe-usage init\` to set up.\n`);
  } else {
    console.log(`  Config: ${getConfigPath()}`);
    console.log(`  API key: ${config.apiKey.slice(0, 8)}...`);
    console.log(`  API URL: ${config.apiUrl || 'https://vibecafe.ai'}`);
    console.log(`  Last sync: ${config.lastSync || 'never'}`);
  }

  console.log('\n  Detected tools:');
  const detected = detectInstalledTools();
  if (detected.length === 0) {
    console.log('    (none)\n');
  } else {
    for (const tool of detected) {
      const hookStatus = tool.inject ? 'auto-sync' : 'manual only';
      console.log(`    ${tool.name} (${hookStatus})`);
    }
    console.log();
  }

  console.log('  All supported tools:');
  for (const tool of TOOLS) {
    const installed = existsSync(tool.dataDir) ? 'installed' : 'not found';
    console.log(`    ${tool.name}: ${installed}`);
  }
  console.log();
}

export async function run(args) {
  const command = args[0];

  switch (command) {
    case 'init': {
      const { runInit } = await import('./init.js');
      await runInit();
      break;
    }
    case 'sync': {
      const { runSync } = await import('./sync.js');
      await runSync();
      break;
    }
    case 'status': {
      await showStatus();
      break;
    }
    case 'help':
    case '--help':
    case '-h': {
      console.log(`
  vibe-usage - Vibe Usage Tracker by VibeCaf\u00e9

  Usage:
    npx vibe-usage          Init (first run) or sync
    npx vibe-usage init     Set up API key and hooks
    npx vibe-usage sync     Manually sync usage data
    npx vibe-usage status   Show config and detected tools
    npx vibe-usage help     Show this help
`);
      break;
    }
    default: {
      const config = loadConfig();
      if (!config?.apiKey) {
        const { runInit } = await import('./init.js');
        await runInit();
      } else {
        const { runSync } = await import('./sync.js');
        await runSync();
      }
    }
  }
}
