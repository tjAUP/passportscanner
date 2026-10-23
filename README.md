# PassportScanner

Reusable browser-based passport MRZ scanner. The scanner runs in the browser,
fills caller-provided form fields, and can attach the selected image to a file
input. A Yii2 asset bundle is included, but the JavaScript can be used without
Yii.

## Install from GitHub

The source repository is
[vick4920/passportscanner](https://github.com/vick4920/passportscanner).
Push the local `main` branch and `v0.1.0` tag before installing it from
GitHub. The Composer package name is `tbroker/passportscanner`.

Add the repository to the consuming project's `composer.json`:

```json
"repositories": [
    {
        "type": "vcs",
        "url": "https://github.com/vick4920/passportscanner"
    }
]
```

Then run `composer require tbroker/passportscanner:^0.1`. Commit the
consumer's `composer.json` and `composer.lock`; deployments can then run
`composer install` to fetch the locked package version. Before a release
tag is pushed, use `composer require tbroker/passportscanner:dev-main` for a
temporary test instead. A private repository needs GitHub credentials
configured for Composer on each machine that installs it.

## Development install

Place this directory beside the consuming project. Add a Composer path
repository to that project's `composer.json`:

```json
"repositories": [
    {
        "type": "path",
        "url": "../passportscanner",
        "options": {"symlink": true}
    }
]
```

Then run `composer require tbroker/passportscanner:@dev`. Do not change the
consuming project until ready to switch from its existing scanner.

## Yii2

Register the asset in a Yii2 view and initialize it after rendering a
container and the target form fields:

```php
<?php
use TBroker\PassportScanner\Yii2\PassportScannerAsset;
use yii\web\View;

PassportScannerAsset::register($this);
echo '<div id="passport-scanner"></div>';
$this->registerJs(<<<'JS'
window.PassportScanner.init({
    container: '#passport-scanner',
    fields: {
        name: '#traveler-name',
        passport: '#traveler-passport',
        dob: '#traveler-dob',
        expiry: '#traveler-passport-expiry',
        nationality: '#traveler-nationality',
        passportImg: '#traveler-passport-image'
    },
    dateFormat: 'ymd'
});
JS, View::POS_READY);
```

Initialize each time a dynamically loaded form is shown. Call
`window.PassportScanner.stop()` when closing a camera-based form. Additional
field keys are `title`, `firstName`, `lastName`, and `gender`. Selectors
must match the consuming form; the package does not create or save those
fields.

The package does not query the marketplace plug-in table. Pass
`availabilityUrl` to a same-origin JSON endpoint returning
`{"available":true}`, or pass `available` as a boolean/function. With
neither option, the scanner is available by default.

The current OCR loader uses Tesseract.js 5 from jsDelivr. It is loaded on
first scan, not by Composer. Pass `tesseractUrl` to load a self-hosted
script instead. Tesseract worker, language, and WASM assets also need local
hosting for fully offline use. Passport images are processed in the
browser; this package does not upload them to an OCR server. The UI expects
jQuery and uses Bootstrap/Font Awesome classes. Camera access requires
HTTPS or localhost and browser permission. OCR results must be reviewed
before saving.

This package is not yet installed by the existing T-Broker project.

## Acknowledgment

This project was developed with assistance from OpenAI Codex.
