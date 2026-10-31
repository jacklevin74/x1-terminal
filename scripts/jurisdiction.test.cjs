const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/jurisdiction.js').default;
function check(country, method = 'GET') {
 const headers = {}; let body;
 const response = { setHeader: (key, value) => headers[key] = value, end: value => body = JSON.parse(value) };
 handler({ method, headers: { 'x-vercel-ip-country': country } }, response);
 return { body, headers, status: response.statusCode };
}
test('blocks US, does not cache country decisions, and allows non-US signals', () => {
 assert.equal(check('US').body.restricted, true);
 assert.equal(check('us').body.restricted, true);
 assert.equal(check('DE').body.restricted, false);
 assert.equal(check('US').headers['Cache-Control'], 'private, no-store, max-age=0');
});
test('does not invent a jurisdiction for missing or malformed country headers', () => {
 for (const country of [undefined, '', 'unknown', ['US'], 'US,DE']) {
  assert.deepEqual(check(country).body, { country: null, restricted: false });
 }
 assert.equal(check('US', 'POST').status, 405);
});
test('US remains blocked while additional country codes can be configured', () => {
 const original = process.env.RESTRICTED_COUNTRIES;
 try {
  process.env.RESTRICTED_COUNTRIES = 'CA, GB';
  assert.equal(check('CA').body.restricted, true);
  assert.equal(check('US').body.restricted, true);
  assert.equal(check('DE').body.restricted, false);
 } finally { if (original === undefined) delete process.env.RESTRICTED_COUNTRIES; else process.env.RESTRICTED_COUNTRIES = original; }
});
