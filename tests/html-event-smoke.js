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
    'data-field-first-name': '#first-name',
    'data-field-passport-no': '#passport',
    'data-field-document-code': '#document-code',
    'data-field-issuing-country-code': '#issuing-country-code',
    'data-field-nationality-code': '#nationality-code',
    'data-field-optional-data': '#optional-data',
    'data-field-dob': '#dob',
    'data-field-expiry': '#expiry',
    'data-date-format': 'Y/m/d',
    'data-availability-url': '/old-availability-endpoint'
});
passport.tagName = 'INPUT';
const passportNumber = element();
const firstName = element();
const documentCode = element();
const issuingCountryCode = element();
const nationalityCode = element();
const optionalData = element();
const dob = element();
const expiry = element();
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
    createElement(tag) {
        if (tag === 'canvas') return {
            getContext() { return { drawImage() {} }; },
            toBlob(callback) { callback({ type: 'image/jpeg' }); }
        };
        return element();
    },
    querySelector(selector) {
        if (selector === 'input.js-tjaup-passportscanner-input') return passport;
        if (selector === '#passport') return passportNumber;
        if (selector === '#scanner-self') return passport;
        if (selector === '#first-name') return firstName;
        if (selector === '#document-code') return documentCode;
        if (selector === '#issuing-country-code') return issuingCountryCode;
        if (selector === '#nationality-code') return nationalityCode;
        if (selector === '#optional-data') return optionalData;
        if (selector === '#dob') return dob;
        if (selector === '#expiry') return expiry;
        return controls[selector] ||= element();
    }
};
const mrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n'
    + 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';
let recognizedText = mrz;
let recognizedQueue = [];
let availabilityRequests = 0;
const window = {
    Tesseract: {
        async createWorker() {
            return {
                async recognize() { return { data: { text: recognizedQueue.shift() || recognizedText } }; },
                async terminate() {}
            };
        }
    }
};
class FakeEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
class FakeFile {
    constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; }
}
const context = {
    window, document, navigator: {}, URL, Event: FakeEvent, CustomEvent: FakeEvent,
    File: FakeFile, setTimeout, clearTimeout, Promise,
    fetch() { availabilityRequests++; throw new Error('Availability requests are obsolete'); }
};
vm.runInNewContext(script, context);

(async () => {
    let result;
    let passportInputEvents = 0;
    passportNumber.addEventListener('input', () => { passportInputEvents++; });
    passport.addEventListener('passportscanner:result', event => { result = event.detail; });
    listeners.DOMContentLoaded();
    await new Promise(resolve => setTimeout(resolve, 0));
    const container = passport.inserted.child;
    assert.equal(passport.inserted.position, 'afterend');
    assert.equal(container.hidden, false);
    assert.equal(availabilityRequests, 0);

    const scanInput = controls['#passport-scanner-1-file'];
    assert.equal(typeof scanInput.listeners.change, 'function');
    scanInput.files = [{ type: 'image/jpeg', name: 'passport.jpg' }];
    scanInput.listeners.change.call(scanInput);
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.equal(passport.value, '');
    assert.equal(passportNumber.value, 'L898902C3');
    assert.equal(passportInputEvents, 1);
    assert.equal(firstName.value, 'ANNA MARIA');
    assert.equal(documentCode.value, 'P');
    assert.equal(issuingCountryCode.value, 'UTO');
    assert.equal(nationalityCode.value, 'UTO');
    assert.equal(optionalData.value, 'ZE184226B');
    assert.equal(dob.value, '1974/08/12');
    assert.equal(expiry.value, '2012/04/15');
    assert.equal(result.fields.passport, 'L898902C3');
    assert.equal(result.fields.passportNo, 'L898902C3');
    assert.equal(result.fields.documentCode, 'P');
    assert.equal(result.fields.issuingCountryCode, 'UTO');
    assert.equal(result.fields.nationalityCode, 'UTO');
    assert.equal(result.fields.sex, 'F');
    assert.equal(result.fields.optionalData, 'ZE184226B');
    assert.equal(result.checks.passport, true);
    assert.equal(result.checks.optionalData, true);
    assert.equal(result.checks.composite, true);
    assert.equal(result.verifiedCount, 3);
    assert.equal(result.complete, true);
    assert.equal('image' in result, false);

    result = undefined;
    recognizedText = mrz.replace('L898902C36', 'L898902C37');
    scanInput.files = [{ type: 'image/jpeg', name: 'bad-passport-check.jpg' }];
    scanInput.listeners.change.call(scanInput);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(result.verifiedCount, 2);
    assert.equal(result.checks.passport, false);
    assert.equal('passport' in result.fields, false);
    assert.equal('passportNo' in result.fields, false);
    assert.equal(passportNumber.value, 'L898902C3');

    result = undefined;
    recognizedQueue = [mrz.replace('L898902C36', 'L898902C37'), mrz];
    const fakeBitmap = async () => ({ width: 100, height: 100, close() {} });
    window.createImageBitmap = fakeBitmap;
    context.createImageBitmap = fakeBitmap;
    scanInput.files = [{ type: 'image/jpeg', name: 'recoverable-passport.jpg' }];
    scanInput.listeners.change.call(scanInput);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(result.checks.passport, true);
    assert.equal(result.fields.passportNo, 'L898902C3');
    assert.equal(recognizedQueue.length, 0, 'a crop should retry an unverified passport number');
    window.createImageBitmap = undefined;
    context.createImageBitmap = undefined;

    result = undefined;
    recognizedText = mrz.replace('ZE184226B<<<<<1', 'ZE184226B<<<<<2');
    scanInput.files = [{ type: 'image/jpeg', name: 'bad-optional-check.jpg' }];
    scanInput.listeners.change.call(scanInput);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(result.checks.optionalData, false);
    assert.equal('optionalData' in result.fields, false);

    result = undefined;
    recognizedText = 'not a passport';
    scanInput.files = [{ type: 'image/jpeg', name: 'other.jpg' }];
    scanInput.listeners.change.call(scanInput);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(result, undefined);
    assert.equal(passportNumber.value, 'L898902C3');

    recognizedText = mrz;
    const formats = [
        ['y/m/d', '74/08/12'],
        ['d m y', '12 08 74'],
        ['l jS F Y \\a\\t H:i:s P', 'Monday 12th August 1974 at 00:00:00 +00:00'],
        ['W o', '33 1974'],
        [
            'd D j l N S w z W F m M n t L o X x Y y a A B g G h H i s u v e I O P p T Z c r U',
            '12 Mon 12 Monday 1 th 1 223 33 August 08 Aug 8 31 0 1974 +1974 1974 1974 74 ' +
                'am AM 041 12 0 12 00 00 00 000000 000 UTC 0 +0000 +00:00 Z UTC 0 ' +
                '1974-08-12T00:00:00+00:00 Mon, 12 Aug 1974 00:00:00 +0000 145497600'
        ],
        ['ymd', '1974-08-12'],
        ['dmy', '12/08/1974']
    ];
    for (const [index, [format, expected]] of formats.entries()) {
        passport.attributes['data-date-format'] = format;
        await window.PassportScanner.initFromElement(passport);
        const nextScanInput = controls[`#passport-scanner-${index + 2}-file`];
        nextScanInput.files = [{ type: 'image/jpeg', name: 'passport.jpg' }];
        nextScanInput.listeners.change.call(nextScanInput);
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.equal(dob.value, expected, format);
    }

    delete passport.attributes['data-date-format'];
    await window.PassportScanner.initFromElement(passport);
    const defaultScanInput = controls[`#passport-scanner-${formats.length + 2}-file`];
    defaultScanInput.files = [{ type: 'image/jpeg', name: 'passport.jpg' }];
    defaultScanInput.listeners.change.call(defaultScanInput);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(dob.value, '1974-08-12');

    passport.attributes['data-field-passport-no'] = '#scanner-self';
    await window.PassportScanner.initFromElement(passport);
    const selfMappedScanInput = controls[`#passport-scanner-${formats.length + 3}-file`];
    selfMappedScanInput.files = [{ type: 'image/jpeg', name: 'passport.jpg' }];
    selfMappedScanInput.listeners.change.call(selfMappedScanInput);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(passport.value, '', 'scanner input must never become the passport number field');

    console.log('MRZ scan filled fields, matched PHP date formats, and emitted a verified result');
})().catch(error => { console.error(error); process.exitCode = 1; });
