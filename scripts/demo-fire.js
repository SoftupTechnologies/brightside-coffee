// `npm run demo:fire <n>`: submits scenario n (0 is a normal order, 1 to 5 the demo scenarios, `all` each of 1 to 5)
// to the running shop over HTTP, as the checkout form would, and prints what the shop answered. The shop is at
// DEMO_URL (default http://localhost:$PORT, PORT defaulting to 3000).
import { SCENARIOS, scenarioInput } from '../src/scenarios.js';

const base = process.env.DEMO_URL?.trim() || `http://localhost:${process.env.PORT || 3000}`;
const arg = process.argv[2];
if (arg === undefined || !/^(?:\d+|all)$/.test(arg)) {
  console.error('Usage: npm run demo:fire <n>   (0 = a normal order, 1 to 5 = a scenario, all = 1 to 5)');
  for (const s of SCENARIOS) console.error(`  ${s.n}  ${s.title}`);
  process.exit(2);
}

const decode = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function fire(n) {
  const title = n === 0 ? 'Normal order' : SCENARIOS.find((s) => s.n === n)?.title;
  const body = new URLSearchParams(scenarioInput(n));
  const response = await fetch(new URL('/checkout', base), { method: 'POST', body, redirect: 'manual' });
  const page = await response.text();
  if (response.status === 303) {
    console.log(`${n} ${title}: order placed, ${new URL(response.headers.get('location'), base)}`);
    return true;
  }
  const ref = /data-ref="([^"]+)"/.exec(page)?.[1];
  const message = /<p class="alert-message">([\s\S]*?)<\/p>/.exec(page)?.[1];
  if (ref) console.log(`${n} ${title}: HTTP ${response.status}, ${decode(message ?? '')} (ref ${ref})`);
  else console.log(`${n} ${title}: HTTP ${response.status}, ${decode(/<div class="notice"[^>]*>([\s\S]*?)<\/div>/.exec(page)?.[1] ?? 'no message on the page')}`);
  return false;
}

try {
  const numbers = arg === 'all' ? SCENARIOS.map((s) => s.n) : [Number(arg)];
  for (const n of numbers) {
    if (n !== 0 && !SCENARIOS.some((s) => s.n === n)) throw new Error(`There is no scenario ${n}.`);
    await fire(n);
  }
} catch (error) {
  console.error(error.cause?.code === 'ECONNREFUSED' ? `The shop does not answer at ${base}; start it with npm start.` : error.message);
  process.exit(1);
}
