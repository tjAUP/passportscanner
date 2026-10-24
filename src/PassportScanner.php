<?php

namespace TjAup;

use TjAup\PassportScanner\Yii2\PassportScannerAsset;
use yii\helpers\Html;
use yii\helpers\Json;
use yii\widgets\InputWidget;

/** Optional Yii2 form widget for the framework-independent browser scanner. */
class PassportScanner extends InputWidget
{
    /** @var array<string, string> CSS selectors for other form fields to fill. */
    public $fields = [];

    /** @var array<string, mixed> JSON-serializable PassportScanner.init options. */
    public $scannerOptions = [];

    public function run()
    {
        $view = $this->getView();
        $asset = PassportScannerAsset::register($view);

        $config = $this->scannerOptions;
        $config['assetBaseUrl'] = $asset->baseUrl . '/';
        $config['fields'] = $this->fields;
        Html::addCssClass($this->options, 'js-tjaup-passportscanner-input');
        $this->options['data-tjaup-passportscanner'] = Json::encode($config);

        return $this->renderInputHtml('text')
            . Html::tag('div', '', ['data-tjaup-passportscanner-container' => '1']);
    }
}
