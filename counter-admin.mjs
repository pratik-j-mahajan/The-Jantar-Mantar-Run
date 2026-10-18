// Manage the live visit/play counters shown in the game.
// Needs the private admin keys in .counter-admin.local.json (created once; never commit it).
//
//   node counter-admin.mjs show                 current totals
//   node counter-admin.mjs set visits 1234      overwrite a total (e.g. with your Google Analytics number)
//   node counter-admin.mjs add plays 50         add (or subtract with a negative number)
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./.counter-admin.local.json', import.meta.url), 'utf8'));
const [cmd = 'show', key, raw] = process.argv.slice(2);
const url = (op, k) => `${cfg.service}/${op}/${cfg.namespace}/${k}`;
const auth = (k) => ({ method: 'POST', headers: { Authorization: `Bearer ${cfg.keys[k]}` } });

async function show() {
  for (const k of Object.keys(cfg.keys)) {
    const j = await (await fetch(url('get', k))).json();
    console.log(`${k.padEnd(7)} ${j.value?.toLocaleString('en-IN') ?? j.error}`);
  }
}

if (cmd === 'show') await show();
else if ((cmd === 'set' || cmd === 'add') && cfg.keys[key] && Number.isFinite(+raw)) {
  const op = cmd === 'set' ? 'set' : 'update';
  const res = await fetch(`${url(op, key)}?value=${Math.trunc(+raw)}`, auth(key));
  console.log(res.ok ? `${cmd} ${key} ${raw}: ok` : `failed (${res.status}): ${await res.text()}`);
  await show();
} else {
  console.log('usage: node counter-admin.mjs show | set <visits|plays> <n> | add <visits|plays> <n>');
  process.exit(1);
}
