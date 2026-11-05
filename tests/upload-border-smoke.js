const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the pixel-only detector with generated images, never passport data.
const source = fs.readFileSync(path.join(__dirname, '..', 'dist', 'passport-scanner.js'), 'utf8');
const start = source.indexOf('    function findUploadContentBounds(');
const end = source.indexOf('    async function prepareBorderlessUpload(', start);
const detect = vm.runInNewContext(source.slice(start, end) + '\nfindUploadContentBounds');
function picture(width, height, pixel) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const color = pixel(x, y);
        data.set([...color, 255], (y * width + x) * 4);
    }
    return { width, height, data };
}
const texture = (x, y) => [80 + x % 90, 90 + y % 90, 130];
const bordered = picture(200, 120, (x, y) => {
    if (x < 2 || y < 2 || x >= 198 || y >= 118) return [45, 45, 45];
    if (x < 10 || x >= 190 || y < 8 || y >= 112) return [255, 255, 255];
    return texture(x, y);
});
assert.deepEqual(JSON.parse(JSON.stringify(detect(bordered))), {
    left: 10 / 200, top: 8 / 120, width: 180 / 200, height: 104 / 120
});
assert.equal(detect(picture(200, 120, texture)), null, 'borderless image is unchanged');
assert.equal(detect(picture(200, 120, () => [255, 255, 255])), null, 'blank image is not a document');
assert.equal(detect(picture(200, 120, () => [0, 0, 0])), null, 'dark image is not a document');
assert.equal(detect(picture(200, 120, (x, y) => x < 50 ? [255, 255, 255] : texture(x, y))), null,
    'ambiguous wide margin must not remove content');
const noBorderWithWhiteBand = picture(200, 120, (x, y) => y >= 50 && y <= 60 ? [255, 255, 255] : texture(x, y));
assert.equal(detect(noBorderWithWhiteBand), null, 'internal blank bands are not borders');
console.log('Upload border detection preserves content and handles nested light/dark margins');
