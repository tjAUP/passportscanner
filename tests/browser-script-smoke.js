const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'dist', 'passport-scanner.js'), 'utf8');
const window = {};
const document = {
    currentScript: { src: 'https://example.test/assets/passportscanner/passport-scanner.js' },
    readyState: 'loading',
    addEventListener() {}
};

vm.runInNewContext(script, { window, document, URL });

assert.equal(typeof window.PassportScanner.init, 'function');
assert.equal(typeof window.PassportScanner.initFromElement, 'function');
assert.equal(typeof window.PassportScanner.stop, 'function');
console.log('Browser script loaded and exposed PassportScanner.init/stop');
