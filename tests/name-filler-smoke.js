const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Synthetic MRZ glyphs only; no real passport image or identity is stored.
const source = fs.readFileSync(path.join(__dirname, '..', 'dist', 'passport-scanner.js'), 'utf8');
const start = source.indexOf('    function findMrzNameBox(');
const end = source.indexOf('    async function prepareIsolatedMrzName(', start);
const helpers = vm.runInNewContext(source.slice(start, end) + '\n({findMrzNameBox, findFillerStart})');

const prefix = 'P<UTOERIKSSON<<ANNA<MARIA';
const line = prefix.padEnd(44, '<');
const width = 44 * 12;
const height = 16;
function pixels(changedGlyph) {
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255);
    for (let index = 0; index < line.length; index++) {
        const isChevron = line[index] === '<' && index !== changedGlyph;
        for (let y = 0; y < height; y++) {
            const columns = isChevron
                ? [Math.round(7 - 6 * (1 - Math.abs(y - 7.5) / 7.5))]
                : [2, 3, 4, 5, 6, 7];
            for (const column of columns) {
                const offset = (y * width + index * 12 + column) * 4;
                data[offset] = data[offset + 1] = data[offset + 2] = 0;
            }
        }
    }
    return {width, height, data};
}
assert.equal(helpers.findFillerStart(pixels()), prefix.length * 12 - 1);
assert.equal(helpers.findFillerStart(pixels(43)), null, 'a damaged filler run is not trimmed');
assert.equal(helpers.findFillerStart(pixels(1)), null, 'a line without the P< marker is not trimmed');

const box = {x0: 10, y0: 80, x1: 500, y1: 100};
assert.equal(helpers.findMrzNameBox([{text: line, bbox: box}], {mrzLine1: line}), box);
assert.equal(helpers.findMrzNameBox([{text: line, bbox: box}], {mrzLine1: line.replace('UTO', 'GBR')}), null);
console.log('Name retry identifies genuine MRZ filler and rejects damaged or unrelated lines');
