<?php

namespace TjAup\PassportScanner\Yii2;

use yii\web\AssetBundle;

/** Publishes the browser scanner and its complete local OCR asset tree. */
class PassportScannerAsset extends AssetBundle
{
    public $sourcePath = __DIR__ . '/../../dist';

    public $js = [
        'passport-scanner.js',
    ];
}
