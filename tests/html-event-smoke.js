const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'dist', 'passport-scanner.js'), 'utf8');
const listeners = {};
const element = (attributes = {}) => ({
    attributes,
    listeners: {},
    hidden: false,
    value: '',
    files: [],
    getAttribute(name) { return this.attributes[name] ?? null; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    dispatchEvent(event) {
        if (this.listeners[event.type]) this.listeners[event.type](event);
        return true;
    },
    insertAdjacentElement(position, child) { this.inserted = { position, child }; },
    replaceChildren() {},
    click() {}
});

const passport = element({
    'data-field-first-name': '#first-name'
});
passport.tagName = 'INPUT';
const firstName = element();
const controls = {};
const document = {
    currentScript: { src: 'https://example.test/assets/passportscanner/passport-scanner.js' },
    baseURI: 'https://example.test/',
    readyState: 'loading',
    body: null,
    head: { appendChild() {} },
    documentElement: { contains() { return true; } },
    addEventListener(name, callback) { listeners[name] = callback; },
    getElementById() { return null; },
    createElement() { return element(); },
    querySelector(selector) {
        if (selector === 'input.js-tjaup-passportscanner-input') return passport;
        if (selector === '#passport') return passport;
        if (selector === '#first-name') return firstName;
        return controls[selector] ||= element();
    }
};
const mrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n'
    + 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';
let recognizedText = mrz;
const window = {
    Tesseract: {
        async createWorker() {
            return {
                async recognize() { return { data: { text: recognizedText } }; },
                async terminate() {}
            };
        }
    }
};
class FakeEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
const context = {
    window, document, navigator: {}, URL, Event: FakeEvent, CustomEvent: FakeEvent,
    setTimeout, clearTimeout, Promise
};
vm.runInNewContext(script, context);

(async () => {
    let result;
    passport.addEventListener('passportscanner:result', event => { result = event.detail; });
    listeners.DOMContentLoaded();
    await new Promise(resolve => setTimeout(resolve, 0));
    const container = passport.inserted.child;
    assert.equal(passport.inserted.position, 'afterend');
    assert.equal(container.hidden, false);

    const scanInput = controls['#passport-scanner-1-file'];
    assert.equal(typeof scanInput.listeners.change, 'function');
    scanInput.files = [{ type: 'image/jpeg', name: 'passport.jpg' }];
    scanInput.listeners.change.call(scanInput);
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(passport.value, 'L898902C3');
    assert.equal(firstName.value, 'ANNA MARIA');
    assert.equal(result.fields.passport, 'L898902C3');
    assert.equal(result.verifiedCount, 3);
    assert.equal(result.complete, true);
    assert.equal('image' in result, false);

    result = undefined;
    recognizedText = 'not a passport';
    scanInput.files = [{ type: 'image/jpeg', name: 'other.jpg' }];
    scanInput.listeners.change.call(scanInput);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(result, undefined);
    assert.equal(passport.value, 'L898902C3');

    console.log('Input class auto-init filled fields and emitted a result only for a usable MRZ');
})().catch(error => { console.error(error); process.exitCode = 1; });
