import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIosArgs, parseJsonMaybe } from '../src/runner.js';
import { assertBundleId, assertCoordinate, assertDuration, assertHttpUrl } from '../src/validators.js';

test('buildIosArgs appends explicit UDID without using a shell', () => {
  assert.deepEqual(buildIosArgs(['launch', 'com.apple.Preferences'], 'ABC-123'), ['launch', 'com.apple.Preferences', '--udid=ABC-123']);
});

test('parseJsonMaybe only parses complete JSON', () => {
  assert.deepEqual(parseJsonMaybe('{"ok":true}'), { ok: true });
  assert.equal(parseJsonMaybe('not-json'), null);
});

test('bundle ids are allowlisted', () => {
  assert.equal(assertBundleId('com.google.chrome.ios'), 'com.google.chrome.ios');
  assert.throws(() => assertBundleId('bad bundle; rm -rf /'));
});

test('browser URLs are limited to http and https', () => {
  assert.equal(assertHttpUrl('https://example.com').startsWith('https://example.com'), true);
  assert.throws(() => assertHttpUrl('file:///etc/passwd'));
});

test('gesture bounds reject unsafe values', () => {
  assert.equal(assertCoordinate(500), 500);
  assert.equal(assertDuration(0.3), 0.3);
  assert.throws(() => assertCoordinate(-1));
  assert.throws(() => assertDuration(15));
});
