# PassportScanner

PassportScanner reads passport MRZ text from an uploaded image or camera frame
in the browser. The Yii2 widget adds scanner controls to a form field and
fills the fields you choose. Scans are processed locally; the package does not
save forms, upload passport images, or send images to an OCR service.

Source: [tjAUP/passportscanner](https://github.com/tjAUP/passportscanner)

## Install in a Yii2 application

This GitHub repository is private. Each machine running Composer needs access to
it. Create a fine-grained GitHub personal access token for
`tjAUP/passportscanner` with read-only **Contents** permission. Store it in
Composer's global authentication file, outside your application repository:

```sh
composer config --global --editor --auth
```

In the editor, set the GitHub token (preserving any other authentication
entries), then save the file:

```json
{
    "github-oauth": {
        "github.com": "YOUR_READ_ONLY_TOKEN"
    }
}
```

Keep the token out of `composer.json` and Git history. Register the GitHub
repository with Composer, then require the package:

```sh
composer config repositories.passportscanner vcs https://github.com/tjAUP/passportscanner
composer require "tjaup/passportscanner:*"
```

The repository command is needed because the package is distributed from
GitHub. The `*` constraint lets `composer update tjaup/passportscanner`
select the latest stable tagged release. Review updates before deploying,
since `*` also allows future releases with breaking changes. Commit your
application's `composer.json` and `composer.lock`; deployment with
`composer install` uses the locked version.

The Yii2 widget is optional within the package. A Yii2 application already
has the framework dependency it needs. Use v0.6.1 or later for automatic OCR
asset URL configuration.

## Add the scanner to a Yii2 form

Use the widget in a Yii2 view:

```php
<?php
use TjAup\PassportScanner;

echo $form->field($model, 'passport')
    ->widget(PassportScanner::className(), [])
    ->label(false);
```

This renders a text input bound to `$model->passport` and scanner controls.
The widget registers the browser script and publishes all scanner assets,
including the local OCR worker, core, and language data. No asset path is
needed in the view. PHP registers the assets and markup; JavaScript performs
the scan in the browser and calls `PassportScanner.init(config)`.

To fill more fields, pass CSS selectors for inputs already on the page:

```php
echo $form->field($model, 'passport')->widget(PassportScanner::class, [
    'fields' => [
        'firstName' => '#traveler-first-name',
        'lastName' => '#traveler-last-name',
        'dob' => '#traveler-dob',
        'expiry' => '#traveler-expiry',
        'nationality' => '#traveler-nationality',
        'passportImg' => '#traveler-passport-image',
    ],
    'scannerOptions' => [
        'dateFormat' => 'ymd',
        'countryNames' => [
            'MY' => 'Malaysia',
            'SG' => 'Singapore',
        ],
    ],
])->label(false);
```

The widget always maps `passport` to its own text input. The other selectors
must point to fields in the rendered form. `passportImg` must point to a file
input if you want the selected or captured image attached to the form.
`scannerOptions` accepts JSON-serializable options such as `dateFormat` and
`countryNames`.
From v0.7.0, rendering the widget always enables its scanner controls;
the earlier availability check has been removed.

| Field key | Scanned value |
| --- | --- |
| `name` | Full name |
| `firstName` | Given name(s) |
| `lastName` | Surname |
| `title` | `MR` or `MS` |
| `gender` | `male` or `female` |
| `passport` | Passport number, when verified |
| `dob` | Date of birth, when verified |
| `expiry` | Expiry date, when verified |
| `nationality` | Value from `countryNames` |
| `passportImg` | Selected or captured image file |

The scanner dispatches a bubbling `passportscanner:result` event on the
passport input after a usable scan. The event's `detail.fields` contains the
accepted MRZ values. Your form code can listen for that event if it needs to
react to a scan. The widget starts one scanner at a time. If you remove a
dynamically shown form, call `PassportScanner.stop()` in its JavaScript close
handler.

Check every populated value against the passport before saving. The widget
does not save the form or upload the image.

## Local OCR assets and privacy

The widget publishes the complete `dist/` directory, including
`dist/ocr/`. Tesseract.js 5.1.1, its worker and core, and English language data
are bundled locally. Keep the OCR file layout unchanged. Serve
`eng.traineddata.gz` as binary without an HTTP `Content-Encoding` header.
Camera use requires HTTPS or localhost and browser permission. A restrictive
Content Security Policy must allow same-origin scripts, workers, and
WebAssembly.

Third-party licenses and attribution are in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `dist/ocr/licenses/`.

## Acknowledgment

This project was developed with assistance from OpenAI Codex.
