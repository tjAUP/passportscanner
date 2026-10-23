<?php

namespace TjAup\PassportScanner\Yii2;

use yii\web\AssetBundle;

class PassportScannerAsset extends AssetBundle
{
    public $sourcePath = __DIR__ . '/../../dist';

    public $js = [
        'passport-scanner.js',
    ];
}
