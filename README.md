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
`js-tjaup-passportscanner-input` class. Use a separate scanner input and map
the real passport number field explicitly. The scanner input can be hidden and
disabled because it is only an anchor for the controls. PHP can render these
inputs as ordinary HTML. jQuery is optional; it can listen for results but the
scanner does not depend on it.

```html
<form method="post" enctype="multipart/form-data">
  <div class="traveler-row">
    <label>Full name <input name="travelers[0][name]" class="traveler-name"></label>
    <label>Given names <input name="travelers[0][firstName]" class="traveler-first-name"></label>
    <label>Surname <input name="travelers[0][lastName]" class="traveler-last-name"></label>
    <label>Title
      <select name="travelers[0][title]" class="traveler-title">
        <option value="">Select</option><option value="MR">Mr</option><option value="MS">Ms</option>
      </select>
    </label>
    <label>Gender
      <select name="travelers[0][gender]" class="traveler-gender">
        <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
      </select>
    </label>
    <label for="traveler-0-passport-no">Passport number</label>
    <input id="traveler-0-passport-no" name="travelers[0][passportNo]" class="traveler-passport-no">
    <input type="hidden" name="travelers[0][passport_scan]"
             class="js-tjaup-passportscanner-input" disabled
             data-field-root=".traveler-row"
             data-field-mrz=".traveler-mrz"
             data-field-passport-no=".traveler-passport-no"
             data-field-name=".traveler-name"
             data-field-first-name=".traveler-first-name"
             data-field-last-name=".traveler-last-name"
             data-field-title=".traveler-title"
             data-field-gender=".traveler-gender"
             data-field-dob=".traveler-dob"
             data-field-expiry=".traveler-expiry"
             data-field-nationality=".traveler-nationality"
             data-field-nationality-code=".traveler-nationality-code"
             data-field-document-code=".traveler-document-code"
             data-field-issuing-country-code=".traveler-issuing-country-code"
             data-field-sex=".traveler-sex"
             data-field-optional-data=".traveler-optional-data"
             data-field-passport-img=".traveler-passport-image"
             data-date-format="Y-m-d"
             data-auto-capture-count="3"
             data-auto-capture-hold-seconds="2"
             data-log-results="false"
             data-language="en"
             data-status-messages='{}'
             data-asset-base-url="/assets/passportscanner/"
             data-country-names='{"MY":"Malaysia","SG":"Singapore","US":"United States"}'>
    <label>Date of birth <input type="date" name="travelers[0][dob]" class="traveler-dob"></label>
    <label>Expiry date <input type="date" name="travelers[0][expiry]" class="traveler-expiry"></label>
    <label>Nationality
      <select name="travelers[0][nationality]" class="traveler-nationality">
        <option value="">Select</option>
        <option value="Malaysia">Malaysia</option>
        <option value="Singapore">Singapore</option>
        <option value="United States">United States</option>
      </select>
    </label>
    <label>Nationality code <input name="travelers[0][nationalityCode]" class="traveler-nationality-code"></label>
    <label>Document code <input name="travelers[0][documentCode]" class="traveler-document-code"></label>
    <label>Issuing country code <input name="travelers[0][issuingCountryCode]" class="traveler-issuing-country-code"></label>
    <label>MRZ sex marker <input name="travelers[0][sex]" class="traveler-sex"></label>
    <label>Issuer optional data <input name="travelers[0][optionalData]" class="traveler-optional-data"></label>
    <label>MRZ as read <textarea name="travelers[0][mrz]" class="traveler-mrz" rows="2" readonly></textarea></label>
    <label>Passport image <input type="file" name="travelers[0][passportImg]" class="traveler-passport-image" accept="image/jpeg,image/png,image/webp"></label>
  </div>
  <button type="submit">Save after checking the passport</button>
</form>
<script src="/assets/passportscanner/passport-scanner.js" defer></script>
```

The example captures 3 automatic camera frames over 2 seconds. These are
explicit example settings; omitting both attributes uses the scanner's default
of 4 frames over 3 seconds. Uploaded images are always scanned once.

The scanner input is separate from the `passportNo` form field and is never
filled with the passport number. The mapped `passportNo` field receives a
verified number. The result also contains the same number in both
`fields.passport` and `fields.passportNo`. The nationality dropdown only accepts the country names
listed in `data-country-names`. The three-letter `nationalityCode` is returned
even when a dropdown has no matching country option. The optional data is
issuer-defined and can be empty.
Add your application's form action and CSRF protection before saving.

The script fills all mapped inputs directly after a usable scan. No result
handler or jQuery code is needed to copy the passport number, dates, or other
details into the form.

The status text pulses blue while scanning. It turns green when the scanner
reads all core details and a readable name, yellow when a usable scan has
missing details or an image attachment fails, and red when scanning fails.
Partial results use a pale yellow background with dark text for readability.
Result messages include a tick (success), warning triangle (partial), or
cross (failure). These built-in icons need no Font Awesome or external files.
Messages use short instructions: "Done. Check all details before saving."
for success, "Some details are missing. Fill them in and check all details."
for partial results, and "Cannot read this passport. Try a clearer photo. No
details changed." when too few details can be read.
Animation is disabled when the browser requests reduced motion. To customize
the colors in your application's CSS, override
`.passport-scanner-status.is-scanning`, `.is-success`, `.is-partial`, and
`.is-error` with a more specific selector such as
`.traveler-row .passport-scanner-status.is-success`.

`data-field-root` scopes selectors to the nearest matching ancestor. Repeat
the `.traveler-row` markup with a new form index for more travelers; each scan
then fills only its own row. New inputs added after page load initialize
automatically. Removing a row releases its scanner. If a row is hidden but
kept in the page, call `PassportScanner.stop(scannerInput)` when hiding it and
`PassportScanner.initFromElement(scannerInput)` when showing it again.

### Optional result event

After a usable scan, the scanner input also emits a bubbling
`passportscanner:result` event. Its `detail.fields` contains the accepted
values. Listen only if your application needs an extra reaction after the
inputs are filled. For example, jQuery can read the result:

```js
$(document).on('passportscanner:result', '.js-tjaup-passportscanner-input', function (event) {
    const { fields, checks } = event.originalEvent.detail;
    const passportNo = checks.passport ? fields.passportNo : undefined;
    const firstName = fields.firstName;
    const mrz = fields.mrz; // OCR-read lines; verify against the document.
    // Use these values in your form state after the traveler verifies them.
});
```

The scanner input is never mapped to the passport number automatically. Map
the separate passport number field with `data-field-passport-no` or
`data-field-passport`. Map the OCR-read MRZ with `data-field-mrz`. Map other fields with
`data-field-name`, `data-field-first-name`, `data-field-last-name`,
`data-field-title`, `data-field-gender`, `data-field-dob`,
`data-field-expiry`, `data-field-nationality`,
`data-field-document-code`, `data-field-issuing-country-code`,
`data-field-nationality-code`, `data-field-sex`, `data-field-optional-data`,
and `data-field-passport-img`.
Optional attributes are `data-date-format`, `data-country-names` (JSON),
`data-auto-capture-count`, `data-auto-capture-hold-seconds`, and
`data-asset-base-url`. Add `data-log-results="true"` to log scan values in
the browser console.

## Use the JavaScript API

Load the published script, then call `PassportScanner.init(config)` for each
scanner container. CSS selectors or DOM elements can be used for fields.

```html
<div class="traveler-row">
<input id="name" name="name">
<input id="first-name" name="firstName">
<input id="last-name" name="lastName">
<select id="title" name="title"><option value="MR">Mr</option><option value="MS">Ms</option></select>
<select id="gender" name="gender"><option value="male">Male</option><option value="female">Female</option></select>
<input id="passport-no" name="passportNo">
<input id="dob" name="dob" type="date">
<input id="expiry" name="expiry" type="date">
<select id="nationality" name="nationality"><option value="Malaysia">Malaysia</option></select>
<input id="nationality-code" name="nationalityCode">
<input id="document-code" name="documentCode">
<input id="issuing-country-code" name="issuingCountryCode">
<input id="sex" name="sex">
<input id="optional-data" name="optionalData">
<textarea id="mrz" name="mrz" rows="2" readonly></textarea>
<input id="passport-image" name="passportImg" type="file">
<div id="scanner"></div>
</div>
<script src="/assets/passportscanner/passport-scanner.js"></script>
<script>
PassportScanner.init({
    container: '#scanner',
    fieldRoot: '.traveler-row',
    fields: {
        mrz: '#mrz',
        name: '#name',
        firstName: '#first-name',
        lastName: '#last-name',
        title: '#title',
        gender: '#gender',
        passportNo: '#passport-no',
        dob: '#dob',
        expiry: '#expiry',
        nationality: '#nationality',
        nationalityCode: '#nationality-code',
        documentCode: '#document-code',
        issuingCountryCode: '#issuing-country-code',
        sex: '#sex',
        optionalData: '#optional-data',
        passportImg: '#passport-image'
    },
    dateFormat: 'Y-m-d',
    countryNames: { MY: 'Malaysia' },
    autoCaptureCount: 3,
    autoCaptureHoldSeconds: 2,
    assetBaseUrl: '/assets/passportscanner/',
    language: 'en',
    statusMessages: {},
    logResults: false
});
</script>
```

The `passportNo` mapping fills the passport number input; the scanner container
is separate. The `passport` key is an alias for the same verified number if
your application uses that field name.

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
| `autoCaptureCount` | Total automatic camera frames, including the first readable frame; integer 1–10, default 4 |
| `autoCaptureHoldSeconds` | Time over which automatic camera frames are collected; 0–30 seconds, default 3 |
| `assetBaseUrl` | URL of the published `dist/` directory; inferred from a script tag |
| `language` | Status language: `en` (English, default), `ms` (Malay), or `zh` (Simplified Chinese); unknown languages fall back to English |
| `statusMessages` | Optional per-instance message overrides; default `{}`. Missing keys use the selected language |
| `logResults` | Log ordered `{field, value}` rows for each scan; default `false` |

By default, auto capture takes 4 frames over 3 seconds. Set
`autoCaptureCount: 1` to capture immediately after the first readable MRZ
frame. When only `autoCaptureHoldSeconds` is set, the scanner takes roughly one
additional frame per second, up to 10 total. When both are set, it spreads the
chosen count evenly across the hold time. The scanner rounds and limits an
out-of-range count to 1–10 and limits hold time to 0–30 seconds. These options
apply to automatic camera capture; the manual **Capture & scan** button takes
one frame, and uploaded images are scanned once.

### Status language and wording

Set `language: 'ms'` or `language: 'zh'` in the scanner configuration, or use
`data-language="ms"` on the scanner input. Regional codes such as `ms-MY`
and `zh-CN` use the base language. English is used when no language is set.
Each scanner instance can use a different language. This changes status text
only; button labels, OCR language, passport results, and date formats stay
independent.

Use `statusMessages` to change any message or provide another language.
For example, pass these options alongside your existing field mappings:

```js
language: 'en',
statusMessages: {
    success: 'Done. Check all details before saving.',
    partial: 'Some details are missing. Fill them in and check all details.',
    unreadable: 'Cannot read this passport. Try a clearer photo. No details changed.',
    hold: 'Hold still for {seconds} seconds.',
    capturingMany: 'Taking {count} photos. Hold still.'
}
```

For HTML, use `data-status-messages='{"success":"Done. Check all details before saving."}'`.
Yii2 consumers can pass `language` and `statusMessages` inside the widget's
`scannerOptions`. Translations are plain text, never HTML. Keep `{seconds}`
and `{count}` where you want the timer or photo count to appear. Keep the
reminder to check all details before saving in your result messages.

All supported message keys:

| Key | When shown |
| --- | --- |
| `ready` | Before scanning |
| `starting` | Starting the scanner |
| `reading` | Reading a passport |
| `capturing` | Taking one photo |
| `capturingMany` | Taking multiple photos; supports `{count}` |
| `hold` | Camera countdown; supports `{seconds}` |
| `comparing` | Checking captured photos |
| `found` | Passport found; keep still |
| `position` | Move the passport's two bottom lines into the guide |
| `looking` | Camera looking for a passport |
| `success` | All core details and a readable name found |
| `partial` | Some details missing |
| `imageMissing` | Details read but photo attachment failed |
| `unreadable` | Too few details verified; fields unchanged |
| `scanFailed` | Other scan error |
| `autoFailed` | Automatic camera scan error |
| `cameraFailed` | Camera could not open |
| `cameraStarting` | Camera not yet ready |
| `captureFailed` | Photo capture failed |
| `pdf` | PDF cannot be scanned |
| `preparing` | Preparing an image |
| `imageFailed` | Image could not be prepared |

`passport` is filled only when its MRZ check passes. `dob` and `expiry` also
require valid MRZ checks. `passportImg` must be a file input if you want to
attach the selected or captured image to a form. The scanner never submits
the form.

Set `logResults: true` in `PassportScanner.init(config)` to inspect scans in
the browser console. For class-based inputs, set `data-log-results="true"` on
the scanner input. A log labeled `PassportScanner scan results` contains an
ordered array of `{ field, value }` rows for that scan. It begins with
`accepted`, `verifiedCount`, `checks`, and `mrz`, followed by passport number,
name, dates, sex, nationality, and document details. Every supported value
appears, including unread or unverified fields as `null`, for example:

```js
[
    { field: 'accepted', value: true },
    { field: 'verifiedCount', value: 2 },
    { field: 'checks', value: { passport: false, dob: true, expiry: true, /* ... */ } },
    { field: 'mrz', value: 'P<...\n...' },
    { field: 'passportNo', value: null },
    // Other fields follow in the documented order.
]
```

The key for passport expiry is `expiry`, even if your form input is named
`passportExp`.
When a scan fails verification, all field values are `null`; `accepted`,
`verifiedCount`, and `checks` explain which checks passed. The `mrz` row
contains the selected, normalized OCR-read MRZ candidate even on a failed
scan, or `null` if no candidate was found. It may contain incorrect or
unverified characters. The image and full OCR text are never logged.
MRZ lines contain sensitive passport details, so enable console logging only
while debugging.

`detail.fields` includes every accepted MRZ value, even when no form field is
mapped to it:

| Field | Value |
| --- | --- |
| `mrz` | Selected OCR-read MRZ lines separated by a newline; verify the text against the passport |
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

MRZ names have no check digit. The scanner removes filler characters that OCR
may mistake for letters and retries rotated uploads when the name is missing,
but it cannot verify name spelling. Always compare filled names with the
passport before saving.

`dateFormat` accepts PHP date letters such as `Y/m/d`, `y/m/d`, and `d m y`.
Escape a format letter with `\` to print it literally. The default `Y-m-d`
fits native HTML `type="date"` inputs. MRZ dates have no time zone; time
tokens represent midnight UTC. Legacy `ymd` and `dmy` settings remain
supported.

The result event has `detail.fields` (including `mrz`), `detail.checks`,
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
