const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'dist', 'passport-scanner.js'), 'utf8');
const mrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n'
    + 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';

function element(attributes = {}) {
    return {
        attributes,
        listeners: {},
        hidden: false,
        value: '',
        classList: { add() {}, remove() {} },
        getAttribute(name) { return this.attributes[name] ?? null; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        removeEventListener(name) { delete this.listeners[name]; },
        dispatchEvent(event) {
            if (this.listeners[event.type]) this.listeners[event.type](event);
            return true;
        },
        replaceChildren() {},
        getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 75 }; },
        async play() {}
    };
}

async function runCase(settings, expectedCaptures, useAttributes = false, recognizedTexts = [mrz], expectRecoveredName = false, useBitmap = false) {
    const captures = [];
    const loggedResults = [];
    const controls = {};
    const container = element({ 'data-tjaup-passportscanner-container': '1' });
    const passport = element(useAttributes ? {
        'data-auto-capture-count': String(settings.autoCaptureCount),
        'data-auto-capture-hold-seconds': String(settings.autoCaptureHoldSeconds)
    } : {});
    passport.tagName = 'INPUT';
    passport.nextElementSibling = container;
    const video = element();
    video.videoWidth = 100;
    video.videoHeight = 75;
    const guide = element();
    guide.getBoundingClientRect = () => ({ left: 4, top: 60, width: 92, height: 10 });
    const document = {
        currentScript: { src: 'https://example.test/assets/passport-scanner.js' },
        baseURI: 'https://example.test/',
        readyState: 'loading',
        body: {},
        head: { appendChild() {} },
        documentElement: { contains() { return true; } },
        addEventListener() {},
        getElementById() { return null; },
        createElement(tag) {
            if (tag !== 'canvas') return element();
            return {
                width: 0,
                height: 0,
                getContext() {
                    return {
                        drawImage() {},
                        getImageData(left, top, width, height) {
                            return { data: new Uint8ClampedArray(width * height * 4) };
                        }
                    };
                },
                toBlob(callback) {
                    captures.push(Date.now());
                    callback({ size: 1, type: 'image/jpeg' });
                }
            };
        },
        querySelector(selector) {
            if (selector.endsWith('-video')) return video;
            if (selector.endsWith('-guide-mrz')) return guide;
            if (selector === '#passport') return passport;
            return controls[selector] ||= element();
        }
    };
    const window = {
        console: { log(label, value) {
            assert.equal(label, 'PassportScanner scan results');
            loggedResults.push(value);
        } },
        Tesseract: {
            async createWorker() {
                return {
                    async recognize() { return { data: { text: recognizedTexts.shift() || mrz } }; },
                    async terminate() {}
                };
            }
        }
    };
    const fakeBitmap = async () => ({ width: 100, height: 75, close() {} });
    if (useBitmap) window.createImageBitmap = fakeBitmap;
    const navigator = {
        mediaDevices: {
            async enumerateDevices() { return [{ kind: 'videoinput' }]; },
            async getUserMedia() {
                return { getTracks() { return [{ stop() {} }]; } };
            }
        }
    };
    class FakeEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    }
    class FakeFile {
        constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; }
    }
    vm.runInNewContext(script, {
        window, document, navigator, URL, Event: FakeEvent, CustomEvent: FakeEvent,
        File: FakeFile, setTimeout, clearTimeout, Promise, Uint8ClampedArray,
        createImageBitmap: useBitmap ? fakeBitmap : undefined
    });

    const result = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Auto capture did not finish')), 5000);
        const target = useAttributes ? passport : container;
        target.addEventListener('passportscanner:result', event => {
            clearTimeout(timeout);
            resolve(event.detail);
        });
    });
    if (useAttributes) await window.PassportScanner.initFromElement(passport);
    else await window.PassportScanner.init({
        container,
        fields: { passport },
        assetBaseUrl: 'https://example.test/assets/',
        ...settings
    });
    await controls['#passport-scanner-1-camera-open'].listeners.click();
    const detail = await result;
    assert.equal(detail.fields.passportNo, 'L898902C3');
    assert.equal(loggedResults.length, settings.logResults ? 1 : 0);
    if (settings.logResults) assert.equal(loggedResults[0][0].passportNo, 'L898902C3');
    if (expectRecoveredName) assert.equal(detail.fields.firstName, 'ANNA MARIA');
    assert.equal(captures.length - (useBitmap ? 1 : 0), expectedCaptures);
    window.PassportScanner.stop();
    return captures;
}

(async () => {
    const defaults = await runCase({}, 4);
    assert.ok(defaults.at(-1) - defaults[0] >= 2800, 'default capture should hold for three seconds');
    await runCase({ autoCaptureCount: 1 }, 1);
    await runCase({ autoCaptureCount: 1, logResults: true }, 1);
    const counted = await runCase({ autoCaptureCount: 4, autoCaptureHoldSeconds: 0.12 }, 4);
    assert.ok(counted.at(-1) - counted[0] >= 80, 'counted samples should span the hold time');
    const timed = await runCase({ autoCaptureHoldSeconds: 0.12 }, 2);
    assert.ok(timed.at(-1) - timed[0] >= 80, 'time-only samples should span the hold time');
    await runCase({ autoCaptureCount: 99, autoCaptureHoldSeconds: 0 }, 10);
    await runCase({ autoCaptureCount: 2, autoCaptureHoldSeconds: 0.05 }, 2, true);
    const badPassport = mrz.replace('L898902C36', 'L898902C37');
    const unreadableName = mrz.replace('ERIKSSON<<ANNA<MARIA', '<<<<<<<<<<<<<<<<<<<<');
    await runCase({ autoCaptureCount: 2, autoCaptureHoldSeconds: 0 }, 2, false,
        [badPassport, unreadableName], true);
    await runCase({ autoCaptureCount: 1 }, 1, false, [badPassport, mrz], false, true);
    console.log('Auto capture count, hold duration, limits, and HTML attributes worked');
})().catch(error => { console.error(error); process.exitCode = 1; });
