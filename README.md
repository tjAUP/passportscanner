# PassportScanner

Framework-independent browser passport MRZ scanner. It reads a selected image
or camera frame in the browser, fills caller-provided form fields, and can
attach the image to a file input. The scanner does not save or upload data.

Source: [tjAUP/passportscanner](https://github.com/tjAUP/passportscanner)

## Installation

PassportScanner runs in the browser. No PHP framework, jQuery, Bootstrap, or
icon library is required. Choose a package manager below, then publish the
**entire** `dist/` directory to a URL on your application's own origin. The
JavaScript file and all of `dist/ocr/` must stay together.

### Option 1: Composer

1. In your application's `composer.json`, add the GitHub VCS repository and
   package requirement. Merge these entries with any repositories or
   requirements you already have:

   ```json
   {
       "repositories": [
           {
               "type": "vcs",
               "url": "https://github.com/tjAUP/passportscanner"
           }
       ],
       "require": {
           "tjaup/passportscanner": "*"
       }
   }
   ```

2. From the application directory, run:

   ```sh
   composer update tjaup/passportscanner
   ```

3. Copy the **contents** of `vendor/tjaup/passportscanner/dist/` into a public
   directory such as `public/assets/passportscanner/`. Your asset pipeline can
   perform this copy during deployment. Do not expose the whole `vendor/`
   directory.

4. Include the published script on your page:

   ```html
   <script src="/assets/passportscanner/passport-scanner.js"></script>
   ```

The `*` requirement allows future `composer update tjaup/passportscanner` runs
to select the latest stable tagged release without editing the version in
`composer.json`. It can also admit breaking releases, so review updates before
deploying. If your application currently requires `^0.3.1`, change that
requirement to `*` once. Commit `composer.json` and `composer.lock`; deployments
use `composer install` to reproduce the selected version. Composer's default
stable setting does not select untagged commits or development branches.

### Option 2: JavaScript package

1. Install the package from GitHub:

   ```sh
   npm install github:tjAUP/passportscanner
   ```

2. Copy the **contents** of `node_modules/@tjaup/passportscanner/dist/` into a
   public directory such as `public/assets/passportscanner/`. Configure your
   build or deployment to repeat this copy after package updates.

3. Import the scanner in a browser-targeted bundle and give it the URL of that
   public directory:

   ```js
   import PassportScanner from '@tjaup/passportscanner';

   PassportScanner.init({
       container: '#passport-scanner',
       assetBaseUrl: '/assets/passportscanner/',
       fields: { passport: '#traveler-passport' }
   });
   ```

When using a regular `<script>` tag instead, the scanner is available as
`window.PassportScanner`, and it detects the asset directory from the script
URL. The [usage example](#use) shows all supported form fields.

### Check the published files

With the example public path above, confirm these URLs load from your own
server:

```text
/assets/passportscanner/passport-scanner.js
/assets/passportscanner/ocr/tesseract.min.js
/assets/passportscanner/ocr/worker.min.js
/assets/passportscanner/ocr/core/
/assets/passportscanner/ocr/lang/eng.traineddata.gz
```

Keep the OCR filenames and directory layout unchanged. Serve
`eng.traineddata.gz` as binary without an HTTP `Content-Encoding` header. For
camera scanning, serve your page over HTTPS or localhost and allow camera
permission. Then use the [example below](#use) to initialize the scanner and
verify the populated fields before saving.

## Use

Render a container and the form fields you want to fill. Pass CSS selectors
or DOM elements for the container and fields:

```html
<input id="traveler-name" name="name">
<input id="traveler-first-name" name="firstName">
<input id="traveler-last-name" name="lastName">
<select id="traveler-title" name="title">
    <option value="">Select title</option>
    <option value="MR">Mr</option><option value="MS">Ms</option>
</select>
<select id="traveler-gender" name="gender">
    <option value="">Select gender</option>
    <option value="male">Male</option><option value="female">Female</option>
</select>
<input id="traveler-passport" name="passport">
<input id="traveler-dob" name="dob" type="date">
<input id="traveler-expiry" name="expiry" type="date">
<select id="traveler-nationality" name="nationality">
    <option value="">Select nationality</option>
    <option value="Malaysia">Malaysia</option>
    <option value="Singapore">Singapore</option>
    <option value="United States">United States</option>
</select>
<input id="traveler-passport-image" name="passportImg" type="file">
<div id="passport-scanner"></div>
<script src="/assets/passportscanner/passport-scanner.js"></script>
<script>
PassportScanner.init({
    container: '#passport-scanner',
    fields: {
        name: '#traveler-name',
        firstName: '#traveler-first-name',
        lastName: '#traveler-last-name',
        title: '#traveler-title',
        gender: '#traveler-gender',
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
`PassportScanner.stop()` when closing it.

### Configuration options

| Option | Type | Behavior |
| --- | --- | --- |
| `container` | CSS selector or DOM element | Required. The scanner renders its controls here. |
| `fields` | Object | Optional mapping of the field keys below to CSS selectors or DOM elements. Omitted fields are not filled. |
| `dateFormat` | `'ymd'` or `'dmy'` | Defaults to `'ymd'` (`YYYY-MM-DD`, suitable for native date inputs). `'dmy'` outputs `DD/MM/YYYY`. |
| `countryNames` | Object | Maps two-letter country codes to the exact values expected by the nationality field, for example `{ MY: 'Malaysia', US: 'United States' }`. Without a matching entry, nationality is not filled. |
| `assetBaseUrl` | URL or path string | URL of the published `dist/` directory. Detected automatically for a script tag; set it when using a bundler or a different asset layout. |
| `available` | Boolean or function returning a Boolean/Promise | Defaults to available. Only a strict `true` shows the scanner. Takes precedence over `availabilityUrl`. |
| `availabilityUrl` | Same-origin URL or path string | Used only when `available` is omitted. Must return JSON such as `{"available":true}`; errors or other responses hide the scanner. |

### Field keys

Each `fields` value is a CSS selector or DOM element in the caller's form.
For text and select fields, the scanner sets the value and dispatches bubbling
`input` and `change` events. The image field receives a file and a `change`
event. Unreadable or unverified text values are left unchanged.

| Key | Value filled from a verified MRZ |
| --- | --- |
| `name` | Full name, given names followed by surname. |
| `firstName` | Given name(s). |
| `lastName` | Surname. |
| `title` | `MR` for an `M` sex marker, `MS` for `F`. |
| `gender` | `male` for `M`, `female` for `F`. |
| `passport` | Passport number, only when its check digit is valid. |
| `dob` | Date of birth, only when its check digit and date are valid. |
| `expiry` | Passport expiry date, only when its check digit and date are valid. |
| `nationality` | Mapped `countryNames` value for the MRZ nationality code. |
| `passportImg` | File input receiving the selected or captured image, where supported by the browser. |

Names are filled only when the MRZ name is readable. The scanner does not
create form fields or save the form. Check the populated values before saving.

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
