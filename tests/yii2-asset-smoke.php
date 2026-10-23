<?php

use TjAup\PassportScanner\Yii2\PassportScannerAsset;
use yii\helpers\FileHelper;
use yii\web\AssetManager;
use yii\web\View;

if ($argc !== 2 || !is_file($argv[1])) {
    fwrite(STDERR, "Usage: php tests/yii2-asset-smoke.php /path/to/yii2/vendor/autoload.php\n");
    exit(2);
}

require $argv[1];
require dirname($argv[1]) . '/yiisoft/yii2/Yii.php';
require dirname(__DIR__) . '/vendor/autoload.php';

$assetDirectory = sys_get_temp_dir() . '/passportscanner-assets-' . bin2hex(random_bytes(8));
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
    };
    $view->setAssetManager(new AssetManager([
        'basePath' => $assetDirectory,
        'baseUrl' => '/passportscanner-test-assets',
        'linkAssets' => false,
    ]));

    ob_start();
    $view->beginPage();
    echo '<!doctype html><html><head>';
    $view->head();
    echo '</head><body>';
    $view->beginBody();
    $bundle = PassportScannerAsset::register($view);
    $view->registerJs('PassportScanner.init({container: "#passport-scanner"});', View::POS_END);
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

    $scriptUrl = $bundle->baseUrl . '/passport-scanner.js';
    $scriptPosition = strpos($html, 'src="' . $scriptUrl . '"');
    $initPosition = strpos($html, 'PassportScanner.init(');
    if (!is_file($bundle->basePath . '/passport-scanner.js') ||
        $scriptPosition === false || $initPosition === false || $scriptPosition >= $initPosition) {
        throw new RuntimeException('The scanner script was not registered in the rendered page.');
    }

    echo "Published {$count} dist files and rendered {$scriptUrl}\n";
} finally {
    Yii::$app = null;
    FileHelper::removeDirectory($assetDirectory);
}
