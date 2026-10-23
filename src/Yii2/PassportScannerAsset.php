<?php

namespace TBroker\PassportScanner\Yii2;

use yii\web\AssetBundle;
use yii\web\JqueryAsset;

class PassportScannerAsset extends AssetBundle
{
    public $sourcePath = __DIR__ . '/../../dist';

    public $js = [
        'passport-scanner.js',
    ];

    public $depends = [
        JqueryAsset::class,
    ];
}
