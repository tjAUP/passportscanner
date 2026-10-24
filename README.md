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

For a complete form, define the corresponding attributes on your Yii2 model
and render the inputs with IDs that match the widget's field selectors:

```php
<?php
use TjAup\PassportScanner;
use yii\helpers\Html;
use yii\widgets\ActiveForm;

$form = ActiveForm::begin([
    'options' => ['enctype' => 'multipart/form-data'],
]);

echo $form->field($model, 'name')->textInput(['id' => 'traveler-name']);
echo $form->field($model, 'firstName')->textInput(['id' => 'traveler-first-name']);
echo $form->field($model, 'lastName')->textInput(['id' => 'traveler-last-name']);
echo $form->field($model, 'title')->dropDownList(
    ['MR' => 'Mr', 'MS' => 'Ms'],
    ['prompt' => 'Select title', 'id' => 'traveler-title']
);
echo $form->field($model, 'gender')->dropDownList(
    ['male' => 'Male', 'female' => 'Female'],
    ['prompt' => 'Select gender', 'id' => 'traveler-gender']
);
echo $form->field($model, 'dob')->input('date', ['id' => 'traveler-dob']);
echo $form->field($model, 'expiry')->input('date', ['id' => 'traveler-expiry']);
echo $form->field($model, 'nationality')->dropDownList(
    [
        'Malaysia' => 'Malaysia',
        'Singapore' => 'Singapore',
        'United States' => 'United States',
    ],
    ['prompt' => 'Select nationality', 'id' => 'traveler-nationality']
);
echo $form->field($model, 'passportImg')->fileInput(['id' => 'traveler-passport-image']);

echo $form->field($model, 'passport')->widget(PassportScanner::class, [
    'options' => ['id' => 'traveler-passport'],
    'fields' => [
        'name' => '#traveler-name',
        'firstName' => '#traveler-first-name',
        'lastName' => '#traveler-last-name',
        'title' => '#traveler-title',
        'gender' => '#traveler-gender',
        'dob' => '#traveler-dob',
        'expiry' => '#traveler-expiry',
        'nationality' => '#traveler-nationality',
        'passportImg' => '#traveler-passport-image',
    ],
    'scannerOptions' => [
        'dateFormat' => 'Y-m-d',
        'countryNames' => [
            'MY' => 'Malaysia',
            'SG' => 'Singapore',
            'US' => 'United States',
        ],
    ],
])->label(false);

echo Html::submitButton('Save');
ActiveForm::end();
```

The widget always maps `passport` to its own text input. The other selectors
must point to fields in the rendered form. `passportImg` must point to a file
input if you want the selected or captured image attached to the form.
`scannerOptions` supports `dateFormat` and `countryNames`. The widget supplies
the scanner container, passport input, and OCR asset URL automatically.
From v0.7.0, rendering the widget always enables its scanner controls;
the earlier availability check has been removed.

`dateFormat` uses [PHP `date_format()` tokens](https://www.php.net/manual/en/datetime.format.php)
for both `dob` and `expiry`. For example, `Y/m/d` gives `1974/08/12`,
`y/m/d` gives `74/08/12`, and `d m y` gives `12 08 74`. Separators and text can
be placed anywhere; prefix a format letter with `\` to print it literally.
The default is `Y-m-d`, which is required for native HTML `type="date"` fields.
MRZ dates have no time or timezone, so PHP time and timezone tokens represent
midnight UTC. The older `ymd` and `dmy` settings still produce their original
`Y-m-d` and `d/m/Y` outputs.
PHP-style formatting is available from v0.8.0.

### Field keys

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
react to a scan. Each widget keeps its own scanner state, so several travelers
can be scanned on the same page. Opening a camera closes any other scanner's
camera; image uploads remain independent.

Check every populated value against the passport before saving. The widget
does not save the form or upload the image.

### Multiple or dynamic travelers

For repeated traveler rows, use a unique Yii2 model index for each traveler
and scope field selectors to that row. Inside an existing `ActiveForm`:

```php
<?php
use TjAup\PassportScanner;
use yii\helpers\Html;

foreach ($travelers as $index => $traveler) {
    echo Html::beginTag('div', ['class' => 'traveler-row']);
    echo $form->field($traveler, "[$index]firstName")
        ->textInput(['class' => 'traveler-first-name']);
    echo $form->field($traveler, "[$index]passportImg")
        ->fileInput(['class' => 'traveler-passport-image']);
    echo $form->field($traveler, "[$index]passport")
        ->widget(PassportScanner::class, [
            'fields' => [
                'firstName' => '.traveler-first-name',
                'passportImg' => '.traveler-passport-image',
            ],
            'scannerOptions' => [
                'fieldRoot' => '.traveler-row',
                'dateFormat' => 'Y-m-d',
            ],
        ]);
    echo Html::endTag('div');
}
```

`fieldRoot` resolves each field selector inside the nearest matching ancestor
of that scanner. Other [field keys](#field-keys) work the
same way. The browser script initializes widgets added to the page later and
cleans up scanners whose rows are removed. If the first widget will arrive
through AJAX, register the asset bundle in the parent view so the script is
already loaded:

```php
<?php
use TjAup\PassportScanner\Yii2\PassportScannerAsset;

PassportScannerAsset::register($this);
```

If a row is hidden but kept in the DOM, call
`PassportScanner.stop(passportInput)` when hiding it and
`PassportScanner.initFromElement(passportInput)` when showing it again.
`PassportScanner.stop()` without an argument stops all scanners. Keep Yii2
input IDs and model indexes unique when cloning rows. Multiple-widget support
is available from v0.9.0.

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
