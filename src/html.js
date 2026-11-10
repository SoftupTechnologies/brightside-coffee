const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text made safe to put in HTML, in an element or a quoted attribute. */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);

/**
 * A tiny template tag: interpolated values are escaped, except arrays (joined) and values made with `raw`, which are
 * HTML already.
 */
export function html(strings, ...values) {
  return raw(strings.reduce((out, text, i) => out + text + (i < values.length ? show(values[i]) : ''), ''));
}

/** HTML that `html` puts in as it is. */
export const raw = (text) => ({ __html: String(text) });

function show(value) {
  if (Array.isArray(value)) return value.map(show).join('');
  if (value && typeof value === 'object' && '__html' in value) return value.__html;
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(value);
}
