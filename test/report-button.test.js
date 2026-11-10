import { test } from 'node:test';
import assert from 'node:assert/strict';
import { widgetTags } from '../src/widget.js';

test('the report button takes its settings from the environment, else akeso.json, and is left out without a key', () => {
  const file = { service: 'https://akeso.softup.co', projectKey: 'shpk_demoKey123' };
  const fromFile = widgetTags({}, file);
  assert.match(fromFile, /akeso\.softup\.co\/widget\/[\d.]+\/akeso-widget\.js/);
  assert.match(fromFile, /"project":"shpk_demoKey123"/);
  assert.match(widgetTags({ AKESO_PROJECT_KEY: 'shpk_fromEnv456', AKESO_SERVICE_URL: '' }, file), /"project":"shpk_fromEnv456"/,
    'the environment wins, and an empty variable falls back to the file');
  assert.equal(widgetTags({}, { service: 'https://akeso.softup.co', projectKey: '' }), '', 'no key, no button');
  assert.equal(widgetTags({}, {}), '');
});

test('AKESO_REPORT_BUTTON=off leaves the button out, as Akeso\'s validation sets it, and a missing script never throws', () => {
  const file = { service: 'https://akeso.softup.co', projectKey: 'shpk_demoKey123' };
  assert.equal(widgetTags({ AKESO_REPORT_BUTTON: 'off' }, file), '');
  assert.match(widgetTags({}, file), /if \(window\.Akeso\) Akeso\.mount\(/);
});
