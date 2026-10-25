const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'dist', 'passport-scanner.js'), 'utf8');
const mrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n'
    + 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';
const listeners = {};
const controls = {};
const travelers = [];
const connected = new Set();
const streams = [];
let mutationCallback;

function element(attributes = {}) {
    return {
        attributes,
        listeners: {},
        hidden: false,
        value: '',
        files: [],
        classList: { add() {}, remove() {} },
        async play() {},
        getAttribute(name) { return this.attributes[name] ?? null; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        removeEventListener(name) { delete this.listeners[name]; },
        dispatchEvent(event) {
            if (this.listeners[event.type]) this.listeners[event.type](event);
            return true;
        },
        replaceChildren() {},
        click() {}
    };
}

function addTraveler(plainHtml = false) {
    const firstName = element();
    const passportNumber = element();
    const container = element({ 'data-tjaup-passportscanner-container': '1' });
    container.isContainer = true;
    container.closest = selector => selector === '.traveler-row' ? {
        querySelector: field => field === '.first-name' ? firstName :
            field === '.passport-no' ? passportNumber : null
    } : null;
    const passport = element(plainHtml ? {
        'data-field-first-name': '.first-name',
        'data-field-passport-no': '.passport-no',
        'data-field-root': '.traveler-row',
        'data-asset-base-url': 'https://example.test/assets/passportscanner/'
    } : {
        'data-tjaup-passportscanner': JSON.stringify({
            fields: { firstName: '.first-name', passportNo: '.passport-no' },
            fieldRoot: '.traveler-row',
            dateFormat: 'Y-m-d',
            assetBaseUrl: 'https://example.test/assets/passportscanner/'
        })
    });
    if (plainHtml) passport.className = 'js-tjaup-passportscanner-input';
    passport.tagName = 'INPUT';
    passport.nextElementSibling = container;
    connected.add(container);
    const traveler = { passport, passportNumber, firstName, container };
    travelers.push(traveler);
    return traveler;
}

const first = addTraveler();
const second = addTraveler();
const document = {
    currentScript: null,
    baseURI: 'https://example.test/',
    readyState: 'loading',
    body: {},
    head: { appendChild() {} },
    documentElement: { contains(node) { return !node.isContainer || connected.has(node); } },
    addEventListener(name, callback) { listeners[name] = callback; },
    getElementById() { return null; },
    createElement() { return element(); },
    querySelectorAll() {
        return travelers.filter(traveler => connected.has(traveler.container)).map(traveler => traveler.passport);
    },
    querySelector(selector) { return controls[selector] ||= element(); }
};
const window = {
    MutationObserver: class {
        constructor(callback) { mutationCallback = callback; }
        observe() {}
    },
    Tesseract: {
        async createWorker() {
            return {
                async recognize() { return { data: { text: mrz } }; },
                async terminate() {}
            };
        }
    }
};
const navigator = {
    mediaDevices: {
        async getUserMedia() {
            const track = { stopped: false, stop() { this.stopped = true; } };
            streams.push(track);
            return { getTracks() { return [track]; } };
        }
    }
};
class FakeEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
vm.runInNewContext(script, {
    window, document, navigator, URL, Event: FakeEvent, CustomEvent: FakeEvent,
    setTimeout, clearTimeout, Promise
});

async function scan(instanceNumber) {
    const input = controls[`#passport-scanner-${instanceNumber}-file`];
    assert.equal(typeof input.listeners.change, 'function');
    input.files = [{ type: 'image/jpeg', name: 'passport.jpg' }];
    input.listeners.change.call(input);
    await new Promise(resolve => setTimeout(resolve, 0));
}

(async () => {
    listeners.DOMContentLoaded();
    assert.equal(typeof mutationCallback, 'function');
    await scan(1);
    assert.equal(first.passport.value, '');
    assert.equal(first.passportNumber.value, 'L898902C3');
    assert.equal(first.firstName.value, 'ANNA MARIA');
    assert.equal(second.passportNumber.value, '');

    await scan(2);
    assert.equal(second.passportNumber.value, 'L898902C3');
    assert.equal(second.firstName.value, 'ANNA MARIA');

    const third = addTraveler();
    mutationCallback();
    await scan(3);
    assert.equal(third.passportNumber.value, 'L898902C3');
    assert.equal(third.firstName.value, 'ANNA MARIA');

    const fourth = addTraveler(true);
    const fifth = addTraveler(true);
    const fourthResults = [];
    const fifthResults = [];
    fourth.passport.addEventListener('passportscanner:result', event => fourthResults.push(event.detail));
    fifth.passport.addEventListener('passportscanner:result', event => fifthResults.push(event.detail));
    mutationCallback();
    await scan(4);
    assert.equal(fourth.passportNumber.value, 'L898902C3');
    assert.equal(fourth.firstName.value, 'ANNA MARIA');
    assert.equal(fifth.firstName.value, '');
    assert.equal(fourthResults[0].fields.passport, 'L898902C3');
    assert.equal(fifthResults.length, 0);
    await scan(5);
    assert.equal(fifth.passportNumber.value, 'L898902C3');
    assert.equal(fifth.firstName.value, 'ANNA MARIA');
    assert.equal(fifthResults[0].fields.passport, 'L898902C3');

    connected.delete(second.container);
    mutationCallback();
    window.PassportScanner.stop(first.passport);
    first.passportNumber.value = '';
    await scan(1);
    assert.equal(first.passportNumber.value, '');
    third.passportNumber.value = '';
    await scan(3);
    assert.equal(third.passportNumber.value, 'L898902C3');

    await window.PassportScanner.initFromElement(first.passport);
    await controls['#passport-scanner-6-camera-open'].listeners.click();
    assert.equal(streams[0].stopped, false);
    await controls['#passport-scanner-3-camera-open'].listeners.click();
    assert.equal(streams[0].stopped, true);
    assert.equal(streams[1].stopped, false);
    window.PassportScanner.stop();
    assert.equal(streams[1].stopped, true);

    console.log('Independent scanner instances survived dynamic add, remove, and targeted stop');
})().catch(error => { console.error(error); process.exitCode = 1; });
