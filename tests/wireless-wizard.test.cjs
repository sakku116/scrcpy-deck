const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

class Element {
    constructor(tag) {
        this.tagName = tag;
        this.children = [];
        this.listeners = {};
        this.attributes = {};
        this.dataset = {};
        this.classes = new Set();
        this.classList = {
            add: (...names) => names.forEach((name) => this.classes.add(name)),
            toggle: (name, force) => {
                const enabled = force ?? !this.classes.has(name);
                if (enabled) this.classes.add(name);
                else this.classes.delete(name);
                return enabled;
            },
        };
        this.value = '';
        this.hidden = false;
        this.isConnected = true;
    }
    append(...els) { els.forEach((el) => this.appendChild(el)); }
    appendChild(el) { this.children.push(el); el.parent = this; return el; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    dispatch(type, event = {}) { (this.listeners[type] || []).forEach((fn) => fn({ target: this, ...event })); }
    setAttribute(k, v) { this.attributes[k] = v; }
    querySelectorAll(selector) {
        const matches = (el) => selector.startsWith('.') ? el.className.split(' ').includes(selector.slice(1)) : selector.startsWith('[role=') ? el.attributes.role === selector.slice(7, -2) : selector === el.tagName;
        return this.children.flatMap((el) => [...(matches(el) ? [el] : []), ...el.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    focus() { Element.document.activeElement = this; }
    close() { this.open = false; this.dispatch('close'); }
    showModal() { this.open = true; }
    cancel() { this.dispatch('cancel'); this.close(); }
    get className() { return [...this.classes].join(' '); }
    set className(v) { this.classes = new Set(v.split(' ').filter(Boolean)); }
}

test('wizard dialog lifecycle, flow labels and pairing request', async () => {
    const requests = [];
    let networkFails = false;
    const document = { body: new Element('body'), activeElement: null, createElement: (tag) => new Element(tag), getElementById: () => null };
    Element.document = document;
    const opener = new Element('button');
    opener.focus();
    const context = {
        document, HTMLElement: Element, window: { setTimeout() {} }, requestAnimationFrame() {},
        require: () => ({ WIRELESS_API_BASE: '/wireless' }),
        fetch: async (url, options) => {
            if (networkFails) throw new Error('offline');
            if (options) requests.push([url, JSON.parse(options.body)]);
            return { json: async () => ({ success: false, message: 'Pair failed' }) };
        },
        exports: {},
    };
    const source = fs.readFileSync('src/app/wizard/WirelessWizard.ts', 'utf8');
    const js = ts.transpile(source.replace(/^import .*;\s*$/gm, ''), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 });
    vm.runInNewContext(js, context);
    const wizard = new context.exports.WirelessWizard();
    wizard.open();
    const dialog = document.body.children[0];
    assert.equal(dialog.open, true);
    wizard.open();
    assert.equal(document.body.children.length, 1);
    const tabs = dialog.querySelectorAll('.sd-tab');
    tabs[1].dispatch('click');
    const panes = dialog.querySelectorAll('.sd-pane');
    assert.equal(panes[0].children[0].className, 'sd-instructions');
    assert.equal(panes[0].children[1].className, 'sd-form');
    assert.equal(panes[1].children[0].className, 'sd-instructions');
    assert.equal(panes[1].children[1].className, 'sd-form');
    assert.equal(panes[1].children[1].children[0].className, 'sd-form-section');
    assert.equal(panes[1].children[1].children[2].className, 'sd-form-section');
    assert.equal(tabs[1].attributes['aria-pressed'], 'true');
    assert.ok(tabs[1].className.split(' ').includes('sd-active'));
    assert.ok(!tabs[0].className.split(' ').includes('sd-active'));
    assert.equal(panes[0].hidden, true);
    assert.ok(!panes[0].className.split(' ').includes('sd-active'));
    assert.equal(panes[1].hidden, false);
    assert.ok(panes[1].className.split(' ').includes('sd-active'));
    const code = panes[1].querySelectorAll('input').find((el) => el.id === 'sd-pair-code');
    assert.ok(panes[1].querySelectorAll('label').some((label) => label.children.includes(code)));
    const host = panes[1].querySelectorAll('input').find((el) => el.id === 'sd-pair-host');
    const port = panes[1].querySelectorAll('input').find((el) => el.id === 'sd-pair-port');
    host.value = '192.168.1.5';
    port.value = '37123';
    code.value = '001234';
    const pairButton = panes[1].querySelectorAll('button')[0];
    pairButton.dispatch('click');
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(requests[0], ['/wireless/pair', { host: '192.168.1.5', port: 37123, code: '001234' }]);
    const status = dialog.querySelector('[role="status"]');
    assert.equal(status.textContent, 'Pair failed');
    assert.equal(status.className, 'sd-status sd-error');
    networkFails = true;
    pairButton.dispatch('click');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(status.textContent, 'Request failed: offline');
    dialog.cancel(); // Simulates native dialog cancel and close; does not verify browser behavior.
    assert.equal(dialog.open, false);
    assert.equal(document.activeElement, opener);
    wizard.open();
    assert.equal(dialog.open, true);
    assert.equal(code.value, '001234');
    assert.ok(panes[1].className.split(' ').includes('sd-active'));
    dialog.querySelectorAll('.sd-close')[0].dispatch('click');
    assert.equal(dialog.open, false);
    assert.equal(document.activeElement, opener);
});
