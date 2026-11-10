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
 * The report button's tags for every page, from AKESO_SERVICE_URL and AKESO_PROJECT_KEY (the project's public key,
 * `shpk_…`). Empty when either is missing or one the widget would refuse, so the shop runs without Akeso.
 */
export function widgetTags(env = process.env) {
  const service = originOf(env.AKESO_SERVICE_URL?.trim() ?? '');
  const project = env.AKESO_PROJECT_KEY?.trim() ?? '';
  if (!service || !PROJECT_KEY.test(project)) return '';
  const version = env.AKESO_WIDGET_VERSION?.trim() || WIDGET_VERSION;
  const integrity = env.AKESO_WIDGET_INTEGRITY?.trim() ?? (version === WIDGET_VERSION ? WIDGET_INTEGRITY : '');
  const options = JSON.stringify({ service, project }).replace(/</g, '\\u003c');
  return `<div id="akeso"></div>
<script src="${escapeHtml(`${service}/widget/${version}/akeso-widget.js`)}"${integrity ? ` integrity="${escapeHtml(integrity)}"` : ''} crossorigin="anonymous"></script>
<script>window.akesoReportButton = Akeso.mount(document.getElementById('akeso'), ${options});</script>
<script src="/static/report-problem.js" defer></script>`;
}
