#!/usr/bin/env node

/**
 * Run a single Playwright e2e spec by short code.
 *
 * Codes:
 *   solo       -> tests/e2e/solo.spec.ts
 *   mp-ui      -> tests/e2e/multiplayer.ui.spec.ts
 *   mp-ready   -> tests/e2e/multiplayer.ready.spec.ts
 *   mp-socket  -> tests/e2e/multiplayer.socket.spec.ts
 *
 * Examples:
 *   npm run test:e2e:code -- mp-ready
 *   npm run test:e2e:ui:code -- solo
 */

const { execSync } = require('child_process');

const args = process.argv.slice(2);
const uiMode = args.includes('--ui');
const positional = args.filter((a) => !a.startsWith('--'));
const code = positional[0];
const extraArgs = args.filter((a) => a !== code && a !== '--ui');

const map = {
  solo: 'tests/e2e/solo.spec.ts',
  'mp-ui': 'tests/e2e/multiplayer.ui.spec.ts',
  'mp-ready': 'tests/e2e/multiplayer.ready.spec.ts',
  'mp-socket': 'tests/e2e/multiplayer.socket.spec.ts',
};

if (!code || !map[code]) {
  console.error(
    'Usage: node scripts/run-e2e-by-code.js [--ui] <code>\n' +
    'Codes: ' + Object.keys(map).join(', ')
  );
  process.exit(1);
}

const spec = map[code];
const env = { ...process.env };
if (uiMode) {
  env.HEADLESS = 'false';
}

const cmd = `npx playwright test ${spec} --project=chromium ${uiMode ? '--headed' : ''} ${extraArgs.join(' ')}`.trim();
console.log(`> ${cmd}`);

execSync(cmd, { stdio: 'inherit', env });
