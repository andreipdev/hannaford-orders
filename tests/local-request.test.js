const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isLocalRequest } = require('../src/lib/local-request');

function request(url = 'http://127.0.0.1:3000/api/grocery-data', headers = {}) {
  return new Request(url, { headers: {
    host: new URL(url).host, 'x-hannaford-local': '1', ...headers
  } });
}

test('allows local UI and command-line requests', () => {
  assert.equal(isLocalRequest(request()), true);
  assert.equal(isLocalRequest(request(undefined, {
    origin: 'http://127.0.0.1:3000', 'sec-fetch-site': 'same-origin'
  })), true);
});

test('rejects public hosts, host spoofing, and DNS-rebinding hostnames', () => {
  assert.equal(isLocalRequest(request('https://example.com/api/grocery-data')), false);
  assert.equal(isLocalRequest(request(undefined, { host: 'evil.example' })), false);
  assert.equal(isLocalRequest(request('http://localhost.evil.example:3000/api/grocery-data')), false);
});

test('rejects cross-origin requests, including a different local port', () => {
  for (const origin of ['https://evil.example', 'http://127.0.0.1:4000', 'null']) {
    assert.equal(isLocalRequest(request(undefined, { origin })), false);
  }
  assert.equal(isLocalRequest(request(undefined, { 'sec-fetch-site': 'cross-site' })), false);
});

test('requires a custom header to reject simple foreign-site browser requests', () => {
  assert.equal(isLocalRequest(request(undefined, { 'x-hannaford-local': '' })), false);
});

test('allows Next.js internal URL normalization but rejects malformed Host headers', () => {
  assert.equal(isLocalRequest(request('http://localhost:43127/api/grocery-data', {
    host: '127.0.0.1:43127', origin: 'http://127.0.0.1:43127'
  })), true);
  for (const host of ['', 'evil.example@127.0.0.1:3000', '127.0.0.1:3000/path']) {
    assert.equal(isLocalRequest(request(undefined, { host })), false);
  }
});
