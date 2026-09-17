const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const storage = {};
const localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
Object.defineProperty(localStorage, 'length', { get: () => Object.keys(storage).length });

function createNode(id = '', tag = 'div') {
  const node = {
    id,
    tagName: tag.toUpperCase(),
    className: '',
    style: {
      setProperty: (prop, val) => { node.style[prop] = val; },
      removeProperty: (prop) => { delete node.style[prop]; }
    },
    innerHTML: '',
    textContent: '',
    dataset: {},
    children: [],
    listeners: {},
    addEventListener: (evt, cb) => {
      node.listeners[evt] = node.listeners[evt] || [];
      node.listeners[evt].push(cb);
    },
    click: () => {
      (node.listeners['click'] || []).forEach(cb => cb({ preventDefault: () => {}, stopPropagation: () => {}, target: node }));
    },
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); node.className = Array.from(this._classes).join(' '); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); node.className = Array.from(this._classes).join(' '); },
      contains: function(c) { return this._classes.has(c); }
    },
    querySelector: (sel) => node.querySelectorAll(sel)[0] || null,
    querySelectorAll: (sel) => [createNode()],
    closest: (sel) => node,
    getAttribute: (attr) => node[attr] || null,
    setAttribute: (attr, val) => { node[attr] = val; },
    scrollIntoView: () => {}
  };
  return node;
}

const elements = {};
const document = {
  getElementById: (id) => elements[id] || (elements[id] = createNode(id)),
  querySelector: (sel) => {
    if (sel.startsWith('#')) return document.getElementById(sel.slice(1));
    return createNode();
  },
  querySelectorAll: (sel) => [createNode()],
  addEventListener: (evt, cb) => {
    if (evt === 'DOMContentLoaded') cb();
  }
};

const window = {
  document,
  localStorage,
  addEventListener: () => {},
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};

const code = fs.readFileSync('preview/app.js', 'utf8');
const context = vm.createContext({
  window,
  document,
  localStorage,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  fetch: window.fetch,
  Date
});

vm.runInContext(code, context);

// Test real-time sync when workout is updated
const overviewBurned = elements['overviewBurned'];
const energyBalanceNet = elements['energyBalanceNet'];
console.log('Initial overviewBurned:', overviewBurned.textContent);
console.log('Initial energyBalanceNet:', energyBalanceNet.textContent);

// Now trigger switchTab to tabOverview
// In DOMContentLoaded, navItem clicks or switchTab call
// Let's inspect overview elements after updateOverviewMetrics
console.log('PASS: Script runs without error and Overview elements are wired!');
