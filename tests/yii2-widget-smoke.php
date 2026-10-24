<?php

use TjAup\PassportScanner;
use TjAup\PassportScanner\Yii2\PassportScannerAsset;
use yii\base\Model;
use yii\helpers\FileHelper;
use yii\helpers\Json;
use yii\web\AssetManager;
use yii\web\View;
use yii\widgets\ActiveForm;

if ($argc !== 2 || !is_file($argv[1])) {
    fwrite(STDERR, "Usage: php tests/yii2-widget-smoke.php /path/to/yii2/vendor/autoload.php\n");
    exit(2);
}

require $argv[1];
require dirname($argv[1]) . '/yiisoft/yii2/Yii.php';
require dirname(__DIR__) . '/vendor/autoload.php';

$assetDirectory = sys_get_temp_dir() . '/passportscanner-widget-assets-' . bin2hex(random_bytes(8));
FileHelper::createDirectory($assetDirectory);

try {
    $view = new View();
    Yii::$app = new class($view) {
        private $view;

        public function __construct(View $view)
        {
            $this->view = $view;
        }

        public function getView()
        {
            return $this->view;
        }

        public function getRequest()
        {
            return null;
        }
    };
    $view->setAssetManager(new AssetManager([
        'basePath' => $assetDirectory,
        'baseUrl' => '/passportscanner-test-assets',
        'linkAssets' => false,
    ]));

    $model = new class extends Model {
        public $passport = 'A1234567';

        public function formName()
        {
            return 'Traveler';
        }
    };

    ob_start();
    $view->beginPage();
    echo '<!doctype html><html><head>';
    $view->head();
    echo '</head><body>';
    $view->beginBody();
    $form = ActiveForm::begin([
        'view' => $view,
        'action' => '/submit',
        'method' => 'get',
        'enableClientScript' => false,
    ]);
    echo $form->field($model, 'passport')->widget(PassportScanner::className(), [
        'options' => ['id' => 'traveler-1-passport'],
        'fields' => ['firstName' => '.traveler-first-name'],
        'scannerOptions' => ['fieldRoot' => '.traveler-row', 'dateFormat' => 'd/m/Y'],
    ])->label(false);
    echo $form->field($model, 'passport')->widget(PassportScanner::className(), [
        'options' => ['id' => 'traveler-2-passport'],
        'fields' => ['firstName' => '.traveler-first-name'],
        'scannerOptions' => ['fieldRoot' => '.traveler-row', 'dateFormat' => 'Y-m-d'],
    ])->label(false);
    ActiveForm::end();
    $bundle = $view->assetBundles[PassportScannerAsset::class] ?? null;
    if ($bundle === null) {
        throw new RuntimeException('The widget did not register the asset bundle.');
    }
    $view->endBody();
    echo '</body></html>';
    $view->endPage();
    $html = ob_get_clean();

    $source = realpath(dirname(__DIR__) . '/dist');
    if ($source === false || realpath($bundle->sourcePath) !== $source) {
        throw new RuntimeException('The bundle does not point to dist/.');
    }
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(
        $source,
        FilesystemIterator::SKIP_DOTS
    ));
    $count = 0;
    foreach ($files as $file) {
        $relativePath = substr($file->getPathname(), strlen($source) + 1);
        $publishedPath = $bundle->basePath . '/' . $relativePath;
        if (!is_file($publishedPath) || filesize($publishedPath) !== $file->getSize()) {
            throw new RuntimeException('Missing or incomplete published asset: ' . $relativePath);
        }
        $count++;
    }

    preg_match_all('/data-tjaup-passportscanner="([^"]+)"/', $html, $configMatches);
    if (count($configMatches[1]) !== 2) {
        throw new RuntimeException('Both widget instances must render their own scanner configuration.');
    }
    foreach ($configMatches[1] as $index => $encoded) {
        $config = Json::decode(html_entity_decode($encoded, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        if (($config['assetBaseUrl'] ?? null) !== $bundle->baseUrl . '/' ||
            ($config['fields']['firstName'] ?? null) !== '.traveler-first-name' ||
            ($config['fieldRoot'] ?? null) !== '.traveler-row' ||
            ($config['dateFormat'] ?? null) !== ($index === 0 ? 'd/m/Y' : 'Y-m-d')) {
            throw new RuntimeException('A widget instance has incorrect scanner configuration.');
        }
    }
    $scriptUrl = $bundle->baseUrl . '/passport-scanner.js';
    if (substr_count($html, 'src="' . $scriptUrl . '"') !== 1) {
        throw new RuntimeException('The scanner script must load once for both widgets.');
    }
    if (strpos($html, 'name="Traveler[passport]"') === false ||
        strpos($html, 'value="A1234567"') === false ||
        strpos($html, 'id="traveler-1-passport"') === false ||
        strpos($html, 'id="traveler-2-passport"') === false ||
        substr_count($html, 'data-tjaup-passportscanner-container="1"') !== 2) {
        throw new RuntimeException('The widgets did not render independent passport inputs and containers.');
    }

    echo "Published {$count} dist files and rendered two Yii2 widgets with {$scriptUrl}\n";
} finally {
    Yii::$app = null;
    FileHelper::removeDirectory($assetDirectory);
}
