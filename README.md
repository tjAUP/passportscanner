# PassportScanner

Framework-independent browser passport MRZ scanner. It reads a selected image
or camera frame in the browser, fills caller-provided form fields, and can
attach the image to a file input. The scanner does not save or upload data.

Source: [vick4920/passportscanner](https://github.com/vick4920/passportscanner)

## Install

The browser script is `dist/passport-scanner.js`. Publish the entire `dist/`
directory, including `dist/ocr/`, to your application's public assets.
Include the script with a script tag or load it through a bundler.
No PHP framework, jQuery, Bootstrap, or icon library is required.

### Composer

Add this VCS repository to the consuming project's `composer.json`:

```json
"repositories": [
    {
        "type": "vcs",
        "url": "https://github.com/vick4920/passportscanner"
    }
]
```

Run `composer require vick4920/passportscanner:^0.3` after the `v0.3.0` tag
has been pushed. Publish the installed `vendor/vick4920/passportscanner/dist/`
directory through your framework's asset pipeline. Do not expose
the whole `vendor` directory. Commit `composer.json` and `composer.lock`;
deployments then use `composer install`.

### JavaScript

Install directly from GitHub with
`npm install github:vick4920/passportscanner`. In a browser-targeted bundle:

```js
import PassportScanner from '@vick4920/passportscanner';
```

The script also exposes `window.PassportScanner` when loaded with a regular
`<script>` tag.

## Use

Render a container and the form fields you want to fill. Pass CSS selectors
or DOM elements for the container and fields:

```html
<input id="traveler-name" name="name">
<input id="traveler-passport" name="passport">
<input id="traveler-dob" name="dob" type="date">
<input id="traveler-expiry" name="expiry" type="date">
<select id="traveler-nationality" name="nationality"></select>
<input id="traveler-passport-image" name="passportImg" type="file">
<div id="passport-scanner"></div>
<script src="/assets/passportscanner/passport-scanner.js"></script>
<script>
PassportScanner.init({
    container: '#passport-scanner',
    fields: {
        name: '#traveler-name',
        passport: '#traveler-passport',
        dob: '#traveler-dob',
        expiry: '#traveler-expiry',
        nationality: '#traveler-nationality',
        passportImg: '#traveler-passport-image'
    },
    countryNames: { MY: 'Malaysia', SG: 'Singapore', US: 'United States' },
    dateFormat: 'ymd'
});
</script>
```

For a bundler, call `PassportScanner.init(config)` on the imported object
instead of loading the script tag, and set
`assetBaseUrl: '/assets/passportscanner/'` to the published `dist/` directory.
With a script tag, this base URL is detected automatically from the script
location. Initialize each time a dynamically loaded form is shown and call
`PassportScanner.stop()` when closing it. Supported
field keys are `name`, `firstName`, `lastName`, `title`, `gender`, `passport`,
`dob`, `expiry`, `nationality`, and `passportImg`. Map `countryNames` to the
values expected by your nationality select. The scanner does not create or
save the target fields.

By default the controls are shown. Use `available: false`, an async
`available()` function, or `availabilityUrl` for a same-origin JSON endpoint
returning `{"available":true}` to control availability.

Tesseract.js 5.1.1, its worker and core, and English language data are bundled
under `dist/ocr/`. No third-party network request is needed during scanning
when the entire directory is served locally. The application's own asset
server must still be reachable; for a fully offline website, cache the app
and these assets with a service worker. Keep the OCR filenames unchanged and
serve `eng.traineddata.gz` as a binary file without an HTTP `Content-Encoding`
header. A restrictive Content Security Policy must permit same-origin scripts,
workers, and WebAssembly. Passport images are processed in the
browser and are not sent to an OCR service. Camera use requires HTTPS or
localhost and browser permission. Always review OCR results before saving.

Third-party licenses and attribution are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `dist/ocr/licenses/`.

## Acknowledgment

This project was developed with assistance from OpenAI Codex.
