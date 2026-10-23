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
    echo $form->field($model, 'passport')->widget(PassportScanner::className(), [])->label(false);
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

    $configStart = strpos($html, 'var config = ');
    $configEnd = $configStart === false ? false : strpos($html, ';config.container', $configStart);
    if ($configStart === false || $configEnd === false) {
        throw new RuntimeException('The widget did not render scanner configuration.');
    }
    $configJson = substr($html, $configStart + strlen('var config = '), $configEnd - $configStart - strlen('var config = '));
    $config = Json::decode($configJson);
    if (($config['assetBaseUrl'] ?? null) !== $bundle->baseUrl . '/') {
        throw new RuntimeException('The widget did not configure the published OCR asset URL.');
    }
    $scriptUrl = $bundle->baseUrl . '/passport-scanner.js';
    $scriptPosition = strpos($html, 'src="' . $scriptUrl . '"');
    $initPosition = strpos($html, 'PassportScanner.init(config)');
    if ($scriptPosition === false || $initPosition === false || $scriptPosition >= $initPosition) {
        throw new RuntimeException('The scanner script must load before widget initialization.');
    }
    if (strpos($html, 'name="Traveler[passport]"') === false ||
        strpos($html, 'value="A1234567"') === false ||
        strpos($html, 'getElementById("traveler-passport")') === false ||
        strpos($html, 'config.resultTarget = config.fields.passport') === false ||
        strpos($html, '-scanner"></div>') === false) {
        throw new RuntimeException('The widget did not render and bind the passport input.');
    }

    echo "Published {$count} dist files and rendered the Yii2 widget with {$scriptUrl}\n";
} finally {
    Yii::$app = null;
    FileHelper::removeDirectory($assetDirectory);
}
