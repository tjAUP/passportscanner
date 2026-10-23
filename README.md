# PassportScanner

Framework-independent browser passport MRZ scanner. It reads a selected image
or camera frame in the browser, fills caller-provided form fields, and can
attach the image to a file input. The scanner does not save or upload data.

Source: [vick4920/passportscanner](https://github.com/vick4920/passportscanner)

## Install

The browser script is `dist/passport-scanner.js`. Include it with a script tag,
copy it into your application's public assets, or load it through a bundler.
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

Run `composer require vick4920/passportscanner:^0.2` after the `v0.2.0` tag
has been pushed. Serve the installed file from
`vendor/vick4920/passportscanner/dist/passport-scanner.js` through your
framework's asset pipeline or copy it to a public directory. Do not expose
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
<script src="/assets/passport-scanner.js"></script>
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
instead of loading the script tag. Initialize each time a dynamically loaded
form is shown and call `PassportScanner.stop()` when closing it. Supported
field keys are `name`, `firstName`, `lastName`, `title`, `gender`, `passport`,
`dob`, `expiry`, `nationality`, and `passportImg`. Map `countryNames` to the
values expected by your nationality select. The scanner does not create or
save the target fields.

By default the controls are shown. Use `available: false`, an async
`available()` function, or `availabilityUrl` for a same-origin JSON endpoint
returning `{"available":true}` to control availability.

Tesseract.js 5 is loaded from jsDelivr on the first scan. Pass
`tesseractUrl` to use a self-hosted script; its worker, language, and WASM
assets must also be hosted locally for fully offline use. Passport images
are processed in the browser, but the OCR runtime requires an internet
connection with the default settings. Camera use requires HTTPS or
localhost and browser permission. Always review OCR results before saving.

## Acknowledgment

This project was developed with assistance from OpenAI Codex.
