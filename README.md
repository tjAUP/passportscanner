# PassportScanner

PassportScanner is a framework-independent browser passport MRZ scanner. It
reads an uploaded image or camera frame locally, fills the form fields you
choose, and can attach the image to a file input. It does not save forms,
upload images, or send them to an OCR service.

The browser code and bundled Tesseract.js assets are in `dist/`. There is no
PHP class or framework dependency in this package.

## Install

Choose one package manager and publish the **entire** `dist/` directory to a
public URL on your application's own origin. Keep `passport-scanner.js` and
`dist/ocr/` together. Do not serve the whole Composer `vendor/` directory.

### Composer

```sh
composer config repositories.passportscanner vcs https://github.com/tjAUP/passportscanner
composer require "tjaup/passportscanner:*"
```

Copy `vendor/tjaup/passportscanner/dist/` to a public directory such as
`public/assets/passportscanner/` during deployment. Then load
`/assets/passportscanner/passport-scanner.js` in the page. `*` lets Composer
select the latest compatible release when you run `composer require` or
`composer update tjaup/passportscanner`. `composer install` uses the versions
recorded in `composer.lock`; commit that file for reproducible deployments.
Review major upgrades before deploying them.

### npm

```sh
npm install github:tjAUP/passportscanner
```

Copy `node_modules/@tjaup/passportscanner/dist/` to the same public directory,
or configure your browser build to emit the script and all of `dist/ocr/`
together. The package can also be imported into a browser-targeted bundle:

```js
import PassportScanner from '@tjaup/passportscanner';
```

When imported, pass `assetBaseUrl` so the scanner can find the published OCR
directory. A regular script tag detects that URL from its own location.

Check that your server can load `passport-scanner.js`, `ocr/tesseract.min.js`,
`ocr/worker.min.js`, the files in `ocr/core/`, and
`ocr/lang/eng.traineddata.gz` from the published directory. Serve the language
file as binary without an HTTP `Content-Encoding` header.

## Use an input class

The script automatically adds scanner controls after inputs with the
`js-tjaup-passportscanner-input` class. PHP can render these inputs as ordinary
HTML. jQuery is optional; it can listen for results but the scanner does not
depend on it.

```html
<div class="traveler-row">
  <input name="travelers[0][firstName]" class="traveler-first-name">
  <input name="travelers[0][passport]"
         class="js-tjaup-passportscanner-input"
         data-field-root=".traveler-row"
         data-field-first-name=".traveler-first-name">
</div>
<div class="traveler-row">
  <input name="travelers[1][firstName]" class="traveler-first-name">
  <input name="travelers[1][passport]"
         class="js-tjaup-passportscanner-input"
         data-field-root=".traveler-row"
         data-field-first-name=".traveler-first-name">
</div>
<script src="/assets/passportscanner/passport-scanner.js" defer></script>
```

`data-field-root` scopes selectors to the nearest matching ancestor, so each
scan fills its own row. New inputs added after page load initialize
automatically. Removing a row releases its scanner. If a row is hidden but
kept in the page, call `PassportScanner.stop(passportInput)` when hiding it and
`PassportScanner.initFromElement(passportInput)` when showing it again.

After a usable scan, the passport input emits a bubbling
`passportscanner:result` event. Its `detail.fields` contains the accepted
values. For example, with jQuery:

```js
$(document).on('passportscanner:result', '.js-tjaup-passportscanner-input', function (event) {
    const result = event.originalEvent.detail;
    console.log(result.fields.passportNo, result.fields.firstName);
    // Ask the traveler to verify the populated fields before saving.
});
```

The input itself is mapped to `passport`, the verified passport number. The
same number is also available as `result.fields.passportNo`; you can use a
field named `passportNo` for the scanner input. Map other fields with
`data-field-name`, `data-field-first-name`, `data-field-last-name`,
`data-field-title`, `data-field-gender`, `data-field-dob`,
`data-field-expiry`, `data-field-nationality`, `data-field-passport-no`,
`data-field-document-code`, `data-field-issuing-country-code`,
`data-field-nationality-code`, `data-field-sex`, `data-field-optional-data`,
and `data-field-passport-img`.
Optional attributes are `data-date-format`, `data-country-names` (JSON), and
`data-asset-base-url`.

## Use the JavaScript API

Load the published script, then call `PassportScanner.init(config)` for each
scanner container. CSS selectors or DOM elements can be used for fields.

```html
<input id="name" name="name">
<input id="first-name" name="firstName">
<input id="last-name" name="lastName">
<select id="title" name="title"><option value="MR">Mr</option><option value="MS">Ms</option></select>
<select id="gender" name="gender"><option value="male">Male</option><option value="female">Female</option></select>
<input id="passport" name="passport">
<input id="dob" name="dob" type="date">
<input id="expiry" name="expiry" type="date">
<select id="nationality" name="nationality"><option value="Malaysia">Malaysia</option></select>
<input id="passport-image" name="passportImg" type="file">
<div id="scanner"></div>
<script src="/assets/passportscanner/passport-scanner.js"></script>
<script>
PassportScanner.init({
    container: '#scanner',
    fields: {
        name: '#name',
        firstName: '#first-name',
        lastName: '#last-name',
        title: '#title',
        gender: '#gender',
        passport: '#passport',
        dob: '#dob',
        expiry: '#expiry',
        nationality: '#nationality',
        passportImg: '#passport-image'
    },
    dateFormat: 'Y-m-d',
    countryNames: { MY: 'Malaysia' },
    assetBaseUrl: '/assets/passportscanner/'
});
</script>
```

Use `fieldRoot: '.traveler-row'` when multiple instances have repeated field
selectors. `PassportScanner.stop(container)` stops one scanner;
`PassportScanner.stop()` stops all scanners. Only one camera can be open at a
time, while image uploads remain independent.

### Configuration

| Option | Purpose |
| --- | --- |
| `container` | Element or selector where controls are rendered; required for `init` |
| `fields` | Field keys and their element references or selectors |
| `fieldRoot` | Ancestor selector or element used to scope field selectors |
| `dateFormat` | PHP `date_format()` style for `dob` and `expiry`; default `Y-m-d` |
| `countryNames` | Map country codes such as `MY` to form option values |
| `assetBaseUrl` | URL of the published `dist/` directory; inferred from a script tag |

`passport` is filled only when its MRZ check passes. `dob` and `expiry` also
require valid MRZ checks. `passportImg` must be a file input if you want to
attach the selected or captured image to a form. The scanner never submits
the form.

`detail.fields` includes every accepted MRZ value, even when no form field is
mapped to it:

| Field | Value |
| --- | --- |
| `name`, `firstName`, `lastName` | Readable MRZ name and parts |
| `passport`, `passportNo` | Same passport number, only when its check digit passes |
| `dob`, `expiry` | Dates, only when their check digits and dates are valid |
| `gender`, `title` | Values derived from an `M` or `F` sex marker |
| `sex` | Original `M` or `F` MRZ marker |
| `nationalityCode` | Three-letter MRZ nationality code |
| `nationality` | Matching value from `countryNames`, when configured |
| `documentCode` | Passport type code from the first MRZ line |
| `issuingCountryCode` | Three-letter issuing state or organization code |
| `optionalData` | Issuer-defined data, only when its check digit passes |

`optionalData` has no universal meaning; an issuing state may use it for a
personal number. MRZ scanning cannot read details that appear only in the
passport's visual area or electronic chip.

`dateFormat` accepts PHP date letters such as `Y/m/d`, `y/m/d`, and `d m y`.
Escape a format letter with `\` to print it literally. The default `Y-m-d`
fits native HTML `type="date"` inputs. MRZ dates have no time zone; time
tokens represent midnight UTC. Legacy `ymd` and `dmy` settings remain
supported.

The result event has `detail.fields`, `detail.checks`,
`detail.verifiedCount` (2 or 3), and `detail.complete`. `detail.checks`
contains boolean `passport`, `dob`, `expiry`, `optionalData`, and `composite`
MRZ check results. It does not contain the passport image. Verify every
populated value against the passport before saving.

## Local assets and privacy

Tesseract.js 5.1.1, its worker, core, and English language data are bundled
in `dist/ocr/`. Camera scanning requires HTTPS or localhost and browser
permission. A restrictive Content Security Policy must allow same-origin
scripts, workers, and WebAssembly.

Third-party licenses and attribution are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `dist/ocr/licenses/`.

## Acknowledgment

This project was developed with assistance from OpenAI Codex.
