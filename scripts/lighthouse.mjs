// Runs Lighthouse (desktop preset) against the preview server for every route and prints scores.
// Usage: npm run preview (in another shell), then: npm run lighthouse [-- /path/ /other/]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const base = (process.env.BASE ?? 'http://localhost:4321') + (process.env.SITE_BASE ?? '').replace(/\/+$/, '');
const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/unit/01/', '/unit/01/standard/2/', '/lab/', '/lab/carbon-allotropes/', '/teacher/'];
mkdirSync('.lighthouse', { recursive: true });

let failed = false;
for (const route of routes) {
  const out = `.lighthouse/${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}.json`;
  const r = spawnSync('npx', ['lighthouse', base + route, '--preset=desktop',
    '--only-categories=performance,accessibility,best-practices', '--output=json', `--output-path=${out}`,
    '--chrome-flags=--headless --no-sandbox --disable-features=HttpsUpgrades,HttpsFirstBalancedModeAutoEnable', '--quiet'], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) { console.error(`lighthouse failed for ${route}`); failed = true; continue; }
  const c = JSON.parse(readFileSync(out, 'utf8')).categories;
  const s = (k) => Math.round(c[k].score * 100);
  const line = `${route.padEnd(28)} performance ${s('performance')}   accessibility ${s('accessibility')}   best practices ${s('best-practices')}`;
  console.log(line);
  if (s('performance') <= 90 || s('accessibility') <= 90) failed = true;
}
process.exit(failed ? 1 : 0);
