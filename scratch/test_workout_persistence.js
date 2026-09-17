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

// Lightweight DOM Node implementation
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
    querySelectorAll: (sel) => {
      let res = [];
      function search(n) {
        if (sel.startsWith('.') && n.classList && n.classList.contains(sel.slice(1))) res.push(n);
        else if (sel.startsWith('#') && n.id === sel.slice(1)) res.push(n);
        else if (sel.includes('[data-id=')) {
          const match = sel.match(/\[data-id="([^"]+)"\]/);
          if (match && n.dataset && n.dataset.id === match[1]) res.push(n);
        }
        (n.children || []).forEach(search);
      }
      (node.children || []).forEach(search);
      return res;
    },
    closest: (sel) => node,
    getAttribute: (attr) => node[attr] || null,
    setAttribute: (attr, val) => { node[attr] = val; }
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

console.log('Testing app.js execution...');
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
console.log('PASS: app.js evaluated cleanly without errors!');
console.log('PASS: window.performUserLogout is function:', typeof context.window.performUserLogout === 'function');

// Test 1: User saves workout data
const userEmail = 'gudhiparithosh@gmail.com';
storage['fittrack_token'] = 'jwt_123';
storage['fittrack_user'] = JSON.stringify({ email: userEmail, name: 'Parithosh' });
storage['fittrack_data_' + userEmail] = JSON.stringify({
  activeBurned: 65,
  completedSetMap: { hammer_curl_1: true, hammer_curl_2: true, hammer_curl_3: true }
});

console.log('Before logout, fittrack_data exists:', !!storage['fittrack_data_' + userEmail]);

// Test 2: Call performUserLogout
context.window.performUserLogout();
console.log('After logout:');
console.log('- token cleared:', storage['fittrack_token'] === undefined);
console.log('- user cleared:', storage['fittrack_user'] === undefined);
console.log('- fittrack_data preserved:', !!storage['fittrack_data_' + userEmail]);

assert.strictEqual(storage['fittrack_token'], undefined, 'token must be cleared on logout');
assert.strictEqual(storage['fittrack_user'], undefined, 'user must be cleared on logout');
assert.ok(storage['fittrack_data_' + userEmail], 'user tracking data must be preserved on logout');

console.log('ALL TESTS PASSED SUCCESSFULLY!');
