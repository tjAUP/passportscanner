# Third-Party Notices

The following OCR assets are redistributed with PassportScanner. Their
licenses apply to those assets; this package's own license is separate.

| Asset | Source | Version | License |
| --- | --- | --- | --- |
| `dist/ocr/tesseract.min.js`, `dist/ocr/worker.min.js` | [Tesseract.js](https://github.com/naptha/tesseract.js) | 5.1.1 | Apache-2.0 |
| `dist/ocr/core/*.wasm.js` | [Tesseract.js Core](https://github.com/naptha/tesseract.js-core) | 5.1.1 | Apache-2.0 |
| `dist/ocr/lang/eng.traineddata.gz` | [Tesseract.js English data](https://github.com/naptha/tessdata) via `@tesseract.js-data/eng` | 1.0.0, `4.0.0_best_int` | Apache-2.0 upstream; npm package metadata lists MIT |

Copies of the upstream Apache licenses are in `dist/ocr/licenses/`.
The two minified JavaScript license notices and full MIT/BSD-3-Clause
license texts for their named bundled dependencies are preserved there too.
The language-data npm package does not contain a separate license file, so
its upstream repository license is included and its npm metadata is noted
above. Retain these notices when redistributing the OCR assets.
