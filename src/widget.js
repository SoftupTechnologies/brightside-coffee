import { readFileSync } from 'node:fs';
import { escapeHtml } from './html.js';

/**
 * The Akeso report button release this shop loads, and that release's SRI hash (the service serves it at
 * `<service>/widget/<version>/akeso-widget.js.sri`). AKESO_WIDGET_VERSION and AKESO_WIDGET_INTEGRITY override them;
 * the Report button page of the Akeso dashboard shows the current pair.
 */
export const WIDGET_VERSION = '0.3.0';
export const WIDGET_INTEGRITY = 'sha384-nBlQzobeNEibKx1wE4nxsTh+++r6qPqiLgePHhoj1zjwQdUaFrgUPeUU93l7TXqH';

const PROJECT_KEY = /^shpk_[A-Za-z0-9_-]{1,64}$/;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The service's origin when the widget accepts it: https, or http on a loopback host; else null. */
function originOf(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK.has(url.hostname)) ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * akeso.json at the shop's root: `{ "service": "https://…", "projectKey": "shpk_…" }`, the report button's settings
 * where the environment gives none. A project's public key is no secret: it is in every page the button is on.
 */
function fileSettings() {
  try {
    return JSON.parse(readFileSync(new URL('../akeso.json', import.meta.url), 'utf8'));
  } catch {
    return {};
  }
}

/**
 * The report button's tags for every page, from AKESO_SERVICE_URL and AKESO_PROJECT_KEY (the project's public key,
 * `shpk_…`), else akeso.json; REPORT_BUTTON=off leaves it out. Empty when either is missing or one the widget would refuse, so the shop runs without Akeso.
 */
export function widgetTags(env = process.env, file = fileSettings()) {
  // REPORT_BUTTON=off leaves it out: Akeso's validation sets it (a kill switch of selfheal.config.json), since it runs the
  // shop where akeso.softup.co cannot be reached. Akeso reserves AKESO_ names in a product's environment, so the switch
  // has none; AKESO_REPORT_BUTTON is read too, for a shop started by hand.
  if ([env.REPORT_BUTTON, env.AKESO_REPORT_BUTTON].some((value) => (value ?? '').trim().toLowerCase() === 'off')) return '';
  const service = originOf(env.AKESO_SERVICE_URL?.trim() || String(file.service ?? ''));
  const project = env.AKESO_PROJECT_KEY?.trim() || String(file.projectKey ?? '').trim();
  if (!service || !PROJECT_KEY.test(project)) return '';
  const version = env.AKESO_WIDGET_VERSION?.trim() || WIDGET_VERSION;
  const integrity = env.AKESO_WIDGET_INTEGRITY?.trim() ?? (version === WIDGET_VERSION ? WIDGET_INTEGRITY : '');
  const options = JSON.stringify({ service, project }).replace(/</g, '\\u003c');
  return `<div id="akeso"></div>
<script src="${escapeHtml(`${service}/widget/${version}/akeso-widget.js`)}"${integrity ? ` integrity="${escapeHtml(integrity)}"` : ''} crossorigin="anonymous"></script>
<script>if (window.Akeso) Akeso.mount(document.getElementById('akeso'), ${options});</script>`;
}
