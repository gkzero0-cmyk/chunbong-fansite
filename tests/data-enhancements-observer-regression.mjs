import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'data-enhancements.js'), 'utf8');

let observerCallback = null;
let textWrites = 0;

function textNode(initial) {
  let value = initial;
  return {
    get textContent() { return value; },
    set textContent(next) { value = String(next); textWrites += 1; }
  };
}

const labelNode = textNode('2026-09-04');
const titleNode = textNode('2026-09-04 · 42');
const point = {
  querySelector(selector) {
    if (selector === '.data-chart-hover-card text:not(.value)') return labelNode;
    if (selector === 'title') return titleNode;
    return null;
  },
  getAttribute() { return null; },
  setAttribute() {}
};

const panel = {
  querySelectorAll() { return []; }
};

const document = {
  readyState: 'complete',
  documentElement: {},
  querySelector(selector) {
    if (selector === '#data-soop-panel') return panel;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.data-chart-hover') return [point];
    return [];
  },
  addEventListener() {}
};

class FakeMutationObserver {
  constructor(callback) { observerCallback = callback; }
  observe() {}
}

const window = {
  fetch: async () => ({ ok: true })
};

vm.runInNewContext(source, {
  window,
  document,
  MutationObserver: FakeMutationObserver,
  Intl,
  Date,
  Map,
  Set,
  Object,
  Array,
  String,
  Number,
  Math,
  JSON,
  console,
  setTimeout() { return 0; },
  Headers: class {},
  Response: class {}
});

assert.equal(typeof observerCallback, 'function', 'data enhancements should install a MutationObserver');
assert.equal(labelNode.textContent, '2026.09.04', 'first presentation pass should format the date label');
assert.equal(titleNode.textContent, '2026.09.04 · 42', 'first presentation pass should format the chart title');

const writesAfterFirstPass = textWrites;
observerCallback([], null);

assert.equal(
  textWrites,
  writesAfterFirstPass,
  'an idempotent MutationObserver pass must not rewrite unchanged chart text and retrigger itself'
);

console.log('Data enhancements observer regression test passed');
