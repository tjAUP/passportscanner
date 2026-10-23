<?php

namespace TjAup;

use TjAup\PassportScanner\Yii2\PassportScannerAsset;
use yii\helpers\Html;
use yii\helpers\Json;
use yii\web\View;
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
        PassportScannerAsset::register($view);

        $inputId = $this->options['id'];
        $containerId = $this->getId() . '-scanner';
        $config = $this->scannerOptions;
        $config['fields'] = (object) $this->fields;

        // DOM references also support custom input IDs that need CSS escaping.
        $js = '(function () {'
            . 'var config = ' . Json::htmlEncode($config) . ';'
            . 'config.container = document.getElementById(' . Json::htmlEncode($containerId) . ');'
            . 'config.fields.passport = document.getElementById(' . Json::htmlEncode($inputId) . ');'
            . 'config.resultTarget = config.fields.passport;'
            . 'PassportScanner.init(config);'
            . '})();';
        $view->registerJs($js, View::POS_END, 'passport-scanner-widget-' . $this->getId());

        return $this->renderInputHtml('text') . Html::tag('div', '', ['id' => $containerId]);
    }
}
