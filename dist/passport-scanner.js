(function(window) {
    'use strict';

    var nationalityToCountry = {
        MYS: 'MY', SGP: 'SG', USA: 'US', GBR: 'GB', CAN: 'CA', AUS: 'AU', NZL: 'NZ',
        CHN: 'CN', JPN: 'JP', KOR: 'KR', IND: 'IN', IDN: 'ID', THA: 'TH', VNM: 'VN',
        PHL: 'PH', HKG: 'HK', TWN: 'TW', FRA: 'FR', DEU: 'DE', ITA: 'IT', ESP: 'ES',
        NLD: 'NL', CHE: 'CH', AUT: 'AT', BEL: 'BE', SWE: 'SE', NOR: 'NO', DNK: 'DK',
        FIN: 'FI', IRL: 'IE', PRT: 'PT', POL: 'PL', TUR: 'TR', ARE: 'AE', SAU: 'SA',
        ZAF: 'ZA', BRA: 'BR', MEX: 'MX', RUS: 'RU', UKR: 'UA', PAK: 'PK', BGD: 'BD',
        LKA: 'LK', NPL: 'NP', KHM: 'KH', LAO: 'LA', MMR: 'MM', MAC: 'MO'
    };
    var ocrLoader = null;
    var scannerInstance = 0;
    var scriptUrl = document.currentScript && document.currentScript.src;
    var detectedAssetBaseUrl = scriptUrl ? new URL('.', scriptUrl).href : null;
    var instances = new Map();
    var initializedInputs = new WeakSet();
    var lifecycleObserver = null;
    var cameraOwner = null;
    var statusTranslations = {
        en: {
            ready: 'Choose a photo or use the camera. Check all details before saving.',
            success: 'Done. Check all details before saving.',
            partial: 'Some details are missing. Fill them in and check all details.',
            reading: 'Reading passport. Please wait...',
            unreadable: 'Cannot read this passport. Try a clearer photo. No details changed.',
            starting: 'Starting scanner. Please wait...',
            capturing: 'Taking photo...',
            capturingMany: 'Taking {count} photos. Hold still.',
            hold: 'Hold still for {seconds} seconds.',
            comparing: 'Checking photos. Please wait...',
            imageMissing: 'Photo not attached. Add it and check all details before saving.',
            scanFailed: 'Scan failed. Try a clearer photo.',
            autoFailed: 'Scan failed. Try taking a photo or choose an image.',
            found: 'Passport found. Hold still.',
            position: 'Move the two bottom lines inside the box.',
            looking: 'Show the two bottom lines of the passport. Hold still.',
            cameraFailed: 'Cannot open camera. Choose a photo instead.',
            pdf: 'Cannot scan a PDF. Choose a JPG or PNG photo.',
            cameraStarting: 'Camera starting. Please wait...',
            captureFailed: 'Cannot take photo. Try again or choose a photo.',
            preparing: 'Opening photo. Please wait...',
            imageFailed: 'Cannot open photo. Try a JPG or PNG photo.'
        },
        ms: {
            ready: 'Pilih gambar atau guna kamera. Semak semua butiran sebelum simpan.',
            success: 'Selesai. Semak semua butiran sebelum simpan.',
            partial: 'Ada butiran yang belum diisi. Lengkapkan dan semak semua butiran.',
            reading: 'Sedang membaca pasport. Sila tunggu...',
            unreadable: 'Pasport tidak dapat dibaca. Cuba gambar lebih jelas. Tiada butiran diubah.',
            starting: 'Pengimbas sedang bermula. Sila tunggu...',
            capturing: 'Sedang mengambil gambar...',
            capturingMany: 'Sedang mengambil {count} gambar. Jangan bergerak.',
            hold: 'Jangan bergerak selama {seconds} saat.',
            comparing: 'Sedang menyemak gambar. Sila tunggu...',
            imageMissing: 'Gambar belum dilampirkan. Tambah gambar dan semak semua butiran sebelum simpan.',
            scanFailed: 'Imbasan gagal. Cuba gambar lebih jelas.',
            autoFailed: 'Imbasan gagal. Cuba ambil gambar atau pilih gambar.',
            found: 'Pasport dikesan. Jangan bergerak.',
            position: 'Letakkan dua baris bawah di dalam kotak.',
            looking: 'Tunjukkan dua baris bawah pasport. Jangan bergerak.',
            cameraFailed: 'Kamera tidak dapat dibuka. Pilih gambar.',
            pdf: 'PDF tidak boleh diimbas. Pilih gambar JPG atau PNG.',
            cameraStarting: 'Kamera sedang bermula. Sila tunggu...',
            captureFailed: 'Gambar tidak dapat diambil. Cuba lagi atau pilih gambar.',
            preparing: 'Sedang membuka gambar. Sila tunggu...',
            imageFailed: 'Gambar tidak dapat dibuka. Cuba gambar JPG atau PNG.'
        },
        zh: {
            ready: '选择照片或使用相机。保存前请检查所有资料。',
            success: '完成。保存前请检查所有资料。',
            partial: '部分资料未填。请补填并检查所有资料。',
            reading: '正在读取护照，请稍等……',
            unreadable: '无法读取护照。请换一张更清晰的照片。资料未更改。',
            starting: '正在启动扫描，请稍等……',
            capturing: '正在拍照……',
            capturingMany: '正在拍摄 {count} 张照片，请保持不动。',
            hold: '请保持不动 {seconds} 秒。',
            comparing: '正在检查照片，请稍等……',
            imageMissing: '照片未添加。请添加照片，并在保存前检查所有资料。',
            scanFailed: '扫描失败。请换一张更清晰的照片。',
            autoFailed: '扫描失败。请重新拍照或选择照片。',
            found: '已找到护照，请保持不动。',
            position: '请将护照底部的两行文字放入框内。',
            looking: '请显示护照底部的两行文字，并保持不动。',
            cameraFailed: '无法打开相机。请选择照片。',
            pdf: '无法扫描 PDF。请选择 JPG 或 PNG 照片。',
            cameraStarting: '正在启动相机，请稍等……',
            captureFailed: '无法拍照。请重试或选择照片。',
            preparing: '正在打开照片，请稍等……',
            imageFailed: '无法打开照片。请换用 JPG 或 PNG 照片。'
        }
    };

    function statusMessage(key, config, values) {
        var language = String(config.language || 'en').toLowerCase().replace(/_/g, '-');
        var translations = statusTranslations[language] || statusTranslations[language.split('-')[0]] || statusTranslations.en;
        var overrides = config.statusMessages;
        var message = overrides && Object.prototype.hasOwnProperty.call(overrides, key) && typeof overrides[key] === 'string'
            ? overrides[key] : translations[key] || statusTranslations.en[key];
        return message.replace(/\{(count|seconds)\}/g, function(token, name) {
            return values && values[name] != null ? String(values[name]) : token;
        });
    }

    function findElement(target) {
        return typeof target === 'string' ? document.querySelector(target) : target || null;
    }

    // Each container gets its own camera, upload, and OCR scan state.
    function createScanner() {
    var activeStream = null;
    var activeVideo = null;
    var activeUi = null;
    var autoScanTimer = null;
    var autoScanBusy = false;
    var autoScanWorkerPromise = null;
    var cameraSequence = 0;
    var activeUploadInput = null;
    var activeUploadListener = null;
    var assetBaseUrl = detectedAssetBaseUrl;
    var scannerApi;

    function localAsset(path) {
        if (!assetBaseUrl) throw new Error('Passport OCR assets are not configured. Set assetBaseUrl to the published dist directory.');
        return new URL('ocr/' + path, assetBaseUrl).href;
    }

    function createOcrWorker(ocr) {
        return ocr.createWorker('eng', 1, {
            workerPath: localAsset('worker.min.js'),
            corePath: localAsset('core/'),
            langPath: localAsset('lang/'),
            workerBlobURL: false
        });
    }

    function emitChange(element, type) {
        element.dispatchEvent(new Event(type, { bubbles: true }));
    }

    function clearUploadListener() {
        if (activeUploadInput && activeUploadListener) {
            activeUploadInput.removeEventListener('change', activeUploadListener);
        }
        activeUploadInput = null;
        activeUploadListener = null;
    }

    function ensureScannerStyles() {
        if (document.getElementById('passport-scanner-styles')) return;
        var style = document.createElement('style');
        style.id = 'passport-scanner-styles';
        style.textContent = [
            '.passport-scanner-field{margin:12px 0 16px;font:inherit;color:inherit}',
            '.passport-scanner-field>label{display:block;margin-bottom:6px}',
            '.passport-scanner-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
            '.passport-scanner-button{appearance:none;border:1px solid #afb9c8;border-radius:4px;background:#fff;color:#17233a;padding:7px 11px;font:inherit;font-size:13px;line-height:1.3;cursor:pointer}',
            '.passport-scanner-button:hover{background:#f2f5f8}',
            '.passport-scanner-button:focus-visible{outline:2px solid #2478c7;outline-offset:2px}',
            '.passport-scanner-button-primary{border-color:#246ca8;background:#246ca8;color:#fff}',
            '.passport-scanner-button-primary:hover{background:#19598e}',
            '.passport-scanner-file{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
            '.passport-scanner-status{flex:1 1 240px;color:#7a728c;font-size:13px;line-height:1.4}',
            '.passport-scanner-status.is-scanning{color:#0b5ed7;animation:passport-scanner-status-pulse 1s ease-in-out infinite}',
            '.passport-scanner-status.is-success{color:#198754}',
            '.passport-scanner-status.is-partial{color:#665200;background-color:#fff3bf}',
            '.passport-scanner-status.is-error{color:#b42318}',
            '.passport-scanner-status.is-success::before,.passport-scanner-status.is-partial::before,.passport-scanner-status.is-error::before{content:"";display:inline-block;width:1em;height:1em;margin-inline-end:.4em;vertical-align:-.12em;background-color:currentColor;mask:var(--passport-status-icon) center/contain no-repeat;-webkit-mask:var(--passport-status-icon) center/contain no-repeat}',
            '.passport-scanner-status.is-success{--passport-status-icon:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M9 16.2 4.8 12 3.4 13.4 9 19 21 7 19.6 5.6Z%27/%3E%3C/svg%3E")}',
            '.passport-scanner-status.is-partial{--passport-status-icon:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath fill-rule=%27evenodd%27 d=%27M12 2 1 22h22ZM11 8h2v7h-2Zm0 9h2v2h-2Z%27/%3E%3C/svg%3E")}',
            '.passport-scanner-status.is-error{--passport-status-icon:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 4 6 6 6-6 2 2-6 6 6 6-2 2-6-6-6 6-2-2 6-6-6-6Z%27/%3E%3C/svg%3E")}',
            '@keyframes passport-scanner-status-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
            '@media (prefers-reduced-motion:reduce){.passport-scanner-status.is-scanning{animation:none}}',
            '.passport-scanner-camera-view{position:relative;width:100%;aspect-ratio:4/3;max-height:min(60vh,560px);margin:10px 0;overflow:hidden;background:#171520}',
            '.passport-scanner-preview{display:block;width:100%;height:100%;object-fit:cover}',
            '.passport-scanner-guide{--guide-color:#fff;position:absolute;left:6%;right:6%;top:50%;transform:translateY(-50%);aspect-ratio:1.42;border:2px solid var(--guide-color);border-radius:6px;box-shadow:0 0 0 999px rgba(0,0,0,.22);pointer-events:none}',
            '.passport-scanner-guide.is-invalid{--guide-color:#ff4d4f}',
            '.passport-scanner-guide.is-steady{--guide-color:#35d07f}',
            '.passport-scanner-guide-mrz{position:absolute;left:3%;right:3%;bottom:6%;height:18%;border-top:2px dashed var(--guide-color);border-bottom:2px dashed var(--guide-color)}',
            '.passport-scanner-camera-panel[hidden],.passport-scanner-camera-open[hidden]{display:none!important}'
        ].join('');
        document.head.appendChild(style);
    }

    function buildScannerUi(config, element) {
        if (!element) return null;
        ensureScannerStyles();

        var id = 'passport-scanner-' + (++scannerInstance);
        element.innerHTML =
            '<div class="passport-scanner-field">' +
                '<label>Scan passport to fill details</label>' +
                '<div class="passport-scanner-tools">' +
                    '<button type="button" id="' + id + '-camera-open" class="passport-scanner-button passport-scanner-button-primary passport-scanner-camera-open" hidden>Use camera</button>' +
                    '<button type="button" id="' + id + '-choose" class="passport-scanner-button">Choose image</button>' +
                    '<input type="file" id="' + id + '-file" class="passport-scanner-file" accept=".jpg,.jpeg,.png,.webp">' +
                    '<span id="' + id + '-status" class="passport-scanner-status" role="status" aria-live="polite"></span>' +
                '</div>' +
                '<div id="' + id + '-camera-panel" class="passport-scanner-camera-panel" hidden>' +
                    '<div class="passport-scanner-camera-view">' +
                        '<video id="' + id + '-video" class="passport-scanner-preview" autoplay playsinline></video>' +
                        '<div id="' + id + '-guide" class="passport-scanner-guide" aria-hidden="true"><span class="passport-scanner-guide-mrz"></span></div>' +
                    '</div>' +
                    '<div class="passport-scanner-tools">' +
                        '<button type="button" id="' + id + '-capture" class="passport-scanner-button passport-scanner-button-primary">Capture &amp; scan</button>' +
                        '<button type="button" id="' + id + '-camera-close" class="passport-scanner-button">Close camera</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        config.dateFormat = config.dateFormat || 'Y-m-d';
        config.countryNames = config.countryNames || {};
        config.fields = config.fields || {};
        var holdSeconds = Number(config.autoCaptureHoldSeconds);
        if (config.autoCaptureHoldSeconds == null || config.autoCaptureHoldSeconds === '' || !Number.isFinite(holdSeconds)) holdSeconds = 3;
        config.autoCaptureHoldSeconds = Math.max(0, Math.min(30, holdSeconds));
        var captureCount = Number(config.autoCaptureCount);
        config.autoCaptureCount = config.autoCaptureCount == null || config.autoCaptureCount === '' || !Number.isFinite(captureCount)
            ? Math.min(10, Math.max(1, Math.ceil(config.autoCaptureHoldSeconds) + 1))
            : Math.max(1, Math.min(10, Math.round(captureCount)));
        config.element = element;
        config.cameraOpen = '#' + id + '-camera-open';
        config.chooseButton = '#' + id + '-choose';
        config.scanInput = '#' + id + '-file';
        config.status = '#' + id + '-status';
        config.cameraPanel = '#' + id + '-camera-panel';
        config.guide = '#' + id + '-guide';
        config.mrzGuide = config.guide + ' .passport-scanner-guide-mrz';
        config.video = '#' + id + '-video';
        config.captureButton = '#' + id + '-capture';
        config.cameraClose = '#' + id + '-camera-close';
        setStatus('ready', config);
        return config;
    }

    function setStatus(key, ui, state, values) {
        ui = ui || activeUi;
        var status = ui && findElement(ui.status);
        if (!status) return;
        status.textContent = statusMessage(key, ui, values);
        status.classList.remove('is-scanning', 'is-success', 'is-partial', 'is-error');
        if (state) status.classList.add('is-' + state);
    }

    function setCameraGuideState(ui, state) {
        var guide = findElement(ui.guide);
        if (!guide) return;
        guide.classList.remove('is-invalid', 'is-steady');
        if (state === 'invalid') guide.classList.add('is-invalid');
        if (state === 'steady') guide.classList.add('is-steady');
    }

    function stopCamera() {
        ++cameraSequence;
        if (cameraOwner === scannerApi) cameraOwner = null;
        if (autoScanTimer) {
            clearTimeout(autoScanTimer);
            autoScanTimer = null;
        }
        var workerPromise = autoScanWorkerPromise;
        autoScanWorkerPromise = null;
        if (workerPromise) workerPromise.then(function(worker) { return worker.terminate(); }).catch(function() {});
        if (activeStream) {
            activeStream.getTracks().forEach(function(track) { track.stop(); });
            activeStream = null;
        }
        if (activeVideo) {
            activeVideo.srcObject = null;
            activeVideo = null;
        }
        var cameraPanel = activeUi && findElement(activeUi.cameraPanel);
        if (cameraPanel) cameraPanel.hidden = true;
    }

    function stop() {
        stopCamera();
        clearUploadListener();
        activeUi = null;
    }

    function ensureOcrLibrary() {
        if (window.Tesseract) return Promise.resolve(window.Tesseract);
        if (ocrLoader) return ocrLoader;

        ocrLoader = new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            try {
                script.src = localAsset('tesseract.min.js');
            } catch (error) {
                reject(error);
                return;
            }
            script.onload = function() {
                if (window.Tesseract) resolve(window.Tesseract);
                else reject(new Error('The local Tesseract.js script did not initialize.'));
            };
            script.onerror = function() {
                reject(new Error('Local passport OCR assets could not load. Check the published dist/ocr directory.'));
            };
            document.head.appendChild(script);
        }).catch(function(error) {
            ocrLoader = null;
            throw error;
        });
        return ocrLoader;
    }

    function getAutoScanWorker() {
        if (!autoScanWorkerPromise) {
            autoScanWorkerPromise = withTimeout(ensureOcrLibrary(), 30000, 'Passport scanner did not load in time.')
                .then(function(ocr) {
                    var pending = createOcrWorker(ocr);
                    return withTimeout(pending, 45000, 'Passport OCR took too long to start.').catch(function(error) {
                        pending.then(function(worker) { return worker.terminate(); }).catch(function() {});
                        throw error;
                    });
                });
            var currentPromise = autoScanWorkerPromise;
            currentPromise.catch(function() {
                if (autoScanWorkerPromise === currentPromise) autoScanWorkerPromise = null;
            });
        }
        return autoScanWorkerPromise;
    }

    function withTimeout(promise, timeoutMs, message) {
        var timer;
        return Promise.race([
            promise,
            new Promise(function(resolve, reject) {
                timer = setTimeout(function() { reject(new Error(message)); }, timeoutMs);
            })
        ]).finally(function() { clearTimeout(timer); });
    }

    async function normalizeSelectedImage(file) {
        var isWebp = file.type === 'image/webp' || /\.webp$/i.test(file.name || '');
        if (!isWebp) return file;
        if (!window.createImageBitmap) throw new Error('This browser cannot prepare WebP images. Save the image as JPG or PNG and try again.');

        var image = await createImageBitmap(file);
        try {
            var canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            canvas.getContext('2d').drawImage(image, 0, 0);
            var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.94); });
            if (!blob) throw new Error('Could not convert this WebP image. Save it as JPG or PNG and try again.');
            return new File([blob], (file.name || 'passport').replace(/\.webp$/i, '') + '.jpg', { type: 'image/jpeg' });
        } finally {
            image.close();
        }
    }

    function formatPhpDate(date, format) {
        // MRZ dates have no time or timezone; time tokens use midnight UTC.
        var year = date.getUTCFullYear();
        var month = date.getUTCMonth() + 1;
        var day = date.getUTCDate();
        var weekday = date.getUTCDay();
        var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        var pad = function(value, length) { return String(value).padStart(length, '0'); };
        var yyyy = pad(year, 4);
        var mm = pad(month, 2);
        var dd = pad(day, 2);
        var dayOfYear = Math.floor((date.getTime() - Date.UTC(year, 0, 1)) / 86400000);
        var isoDate = new Date(date.getTime());
        isoDate.setUTCDate(day + 4 - (weekday || 7));
        var isoYear = isoDate.getUTCFullYear();
        var isoWeek = Math.ceil((((isoDate.getTime() - Date.UTC(isoYear, 0, 1)) / 86400000) + 1) / 7);
        var suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' :
            ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
        var tokens = {
            d: dd, D: weekdays[weekday].slice(0, 3), j: String(day), l: weekdays[weekday],
            N: String(weekday || 7), S: suffix, w: String(weekday), z: String(dayOfYear),
            W: pad(isoWeek, 2),
            F: months[month - 1], m: mm, M: months[month - 1].slice(0, 3),
            n: String(month), t: String(new Date(Date.UTC(year, month, 0)).getUTCDate()),
            L: String(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 1 : 0),
            o: String(isoYear), X: '+' + yyyy, x: yyyy, Y: yyyy, y: yyyy.slice(-2),
            a: 'am', A: 'AM', B: '041', g: '12', G: '0', h: '12', H: '00',
            i: '00', s: '00', u: '000000', v: '000',
            e: 'UTC', I: '0', O: '+0000', P: '+00:00', p: 'Z', T: 'UTC', Z: '0',
            c: yyyy + '-' + mm + '-' + dd + 'T00:00:00+00:00',
            r: weekdays[weekday].slice(0, 3) + ', ' + dd + ' ' + months[month - 1].slice(0, 3) +
                ' ' + yyyy + ' 00:00:00 +0000',
            U: String(Math.floor(date.getTime() / 1000))
        };
        var result = '';
        for (var index = 0; index < format.length; index++) {
            var character = format.charAt(index);
            if (character === '\\' && index + 1 < format.length) {
                result += format.charAt(++index);
            } else if (Object.prototype.hasOwnProperty.call(tokens, character)) {
                result += tokens[character];
            } else {
                result += character;
            }
        }
        return result;
    }

    function parseMrzDate(value, isBirthDate, dateFormat) {
        if (!/^\d{6}$/.test(value)) return '';
        var yearPart = parseInt(value.slice(0, 2), 10);
        var currentYearPart = new Date().getFullYear() % 100;
        var year = isBirthDate && yearPart > currentYearPart ? 1900 + yearPart : 2000 + yearPart;
        var month = parseInt(value.slice(2, 4), 10);
        var day = parseInt(value.slice(4, 6), 10);
        var date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';

        var format = dateFormat === 'ymd' ? 'Y-m-d' : dateFormat === 'dmy' ? 'd/m/Y' : dateFormat;
        return formatPhpDate(date, typeof format === 'string' && format ? format : 'Y-m-d');
    }

    function mrzCheckDigit(value) {
        var weights = [7, 3, 1];
        var total = 0;
        for (var i = 0; i < value.length; i++) {
            var character = value[i];
            var number = character === '<' ? 0 : /\d/.test(character) ? parseInt(character, 10) : character.charCodeAt(0) - 55;
            total += number * weights[i % weights.length];
        }
        return String(total % 10);
    }

    function findMrzLines(text) {
        var lines = text.toUpperCase().split(/\r?\n/).map(function(line) {
            return line.replace(/[«‹〈]/g, '<').replace(/[^A-Z0-9<]/g, '');
        }).filter(Boolean);

        for (var i = 0; i < lines.length; i++) {
            var start = lines[i].search(/P<[A-Z]{3}/);
            if (start < 0) start = lines[i].search(/P[A-Z][A-Z]{3}/);
            if (start < 0) continue;
            var firstLine = lines[i].slice(start);
            if (!firstLine.includes('<')) continue;
            var nextIndex = i + 1;
            var secondLine = '';

            if (firstLine.length >= 70) {
                secondLine = firstLine.slice(44);
                firstLine = firstLine.slice(0, 44);
            } else {
                while (firstLine.length < 25 && nextIndex < lines.length && !/^[0-9]/.test(lines[nextIndex])) {
                    firstLine += lines[nextIndex++];
                }
                while (nextIndex < lines.length && secondLine.length < 20) {
                    if (/P(?:<|[A-Z])[A-Z]{3}/.test(lines[nextIndex])) break;
                    secondLine += lines[nextIndex++];
                }
            }

            if (firstLine.length < 20 || secondLine.length < 20) continue;
            return [
                firstLine.padEnd(44, '<').slice(0, 44),
                secondLine.padEnd(44, '<').slice(0, 44)
            ];
        }
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].length >= 20 && Object.keys(nationalityToCountry).some(function(code) {
                var index = lines[j].indexOf(code, 8);
                return index >= 8 && index <= 13;
            })) {
                return ['', lines[j].padEnd(44, '<').slice(0, 44)];
            }
        }
        return null;
    }

    function findMrzNameLine(text) {
        var lines = text.toUpperCase().split(/\r?\n/);
        for (var strict = 1; strict >= 0; strict--) {
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].replace(/[«‹〈]/g, '<').replace(/[^A-Z0-9<]/g, '');
                var start = line.search(strict ? /P<[A-Z]{3}/ : /P[A-Z][A-Z]{3}/);
                if (start >= 0 && line.length - start >= 12 && line.slice(start).includes('<')) {
                    return line.slice(start, start + 44).padEnd(44, '<');
                }
            }
        }
        return '';
    }

    async function prepareMrzCrop(file, region) {
        var image = await createImageBitmap(file);
        try {
            var cropX = region ? Math.max(0, Math.min(image.width - 1, Math.round(image.width * region.left))) : 0;
            var cropY = region ? Math.max(0, Math.min(image.height - 1, Math.round(image.height * region.top))) : Math.round(image.height * 0.78);
            var cropWidth = region ? Math.round(image.width * region.width) : image.width;
            var cropHeight = region ? Math.round(image.height * region.height) : image.height - cropY;
            cropWidth = Math.max(1, Math.min(cropWidth, image.width - cropX));
            cropHeight = Math.max(1, Math.min(cropHeight, image.height - cropY));
            var scale = Math.min(4, Math.max(2, 2400 / cropWidth));
            var canvas = document.createElement('canvas');
            canvas.width = Math.round(cropWidth * scale);
            canvas.height = Math.round(cropHeight * scale);
            var context = canvas.getContext('2d');
            context.filter = 'grayscale(1) contrast(1.5)';
            context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
            var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.95); });
            if (!blob) throw new Error('Could not prepare the passport image for scanning.');
            return new File([blob], 'passport-mrz.jpg', { type: 'image/jpeg' });
        } finally {
            image.close();
        }
    }

    async function prepareMrzNameCrop(file) {
        var image = await createImageBitmap(file);
        try {
            var top = Math.round(image.height * 0.12);
            var height = Math.round(image.height * 0.5);
            var padding = Math.max(12, Math.round(height * 0.12));
            var canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = height + padding * 2;
            var context = canvas.getContext('2d');
            context.fillStyle = '#fff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, top, image.width, height, 0, padding, image.width, height);
            var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.95); });
            if (!blob) throw new Error('Could not prepare the passport name for scanning.');
            return new File([blob], 'passport-name.jpg', { type: 'image/jpeg' });
        } finally {
            image.close();
        }
    }

    async function rotateImage(file, degrees) {
        var image = await createImageBitmap(file);
        try {
            var quarterTurn = degrees === 90 || degrees === 270;
            var canvas = document.createElement('canvas');
            canvas.width = quarterTurn ? image.height : image.width;
            canvas.height = quarterTurn ? image.width : image.height;
            var context = canvas.getContext('2d');
            context.translate(canvas.width / 2, canvas.height / 2);
            context.rotate(degrees * Math.PI / 180);
            context.drawImage(image, -image.width / 2, -image.height / 2);
            var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.95); });
            if (!blob) throw new Error('Could not rotate the passport image for scanning.');
            return new File([blob], 'passport-rotated-' + degrees + '.jpg', { type: 'image/jpeg' });
        } finally {
            image.close();
        }
    }

    function normalizeMrzNamePart(value) {
        var parts = value.replace(/</g, ' ').trim().split(/\s+/).filter(Boolean);
        while (parts.length > 1 && parts[0].length >= 5 && new Set(parts[0]).size <= 2) parts.shift();
        if (parts.length > 1 && parts[0].length === 1 && parts[1].length >= 5) {
            parts[1] = parts[0] + parts[1];
            parts.shift();
        }
        return parts.join(' ').replace(/[^A-Z '-]/g, '').trim();
    }

    function parseMrzName(line) {
        var field = line.slice(5).replace(/\s+/g, '').replace(/<+$/g, '');
        var separator = field.indexOf('<<');
        var parts;
        if (separator >= 0) {
            var surnamePart = field.slice(0, separator).replace(/</g, ' ').trim();
            var givenField = field.slice(separator + 2)
                .replace(/<{2,}.*$/, '')
                .replace(/[<LK]{5,}$/, '');
            var givenNamePart = givenField.replace(/</g, ' ').trim();
            parts = [givenNamePart, surnamePart].filter(Boolean).join(' ').split(/\s+/);
        } else {
            parts = field.split(/<+/).map(function(part) { return part.trim(); }).filter(Boolean);
        }

        while (parts.length > 1 && parts[0].length >= 5 && new Set(parts[0]).size <= 2) parts.shift();
        if (parts.length > 1 && parts[0].length === 1 && parts[1].length >= 5) {
            parts[1] = parts[0] + parts[1];
            parts.shift();
        }
        var fullName = parts.join(' ').replace(/[^A-Z '-]/g, '').trim();
        var surname = separator >= 0 ? normalizeMrzNamePart(field.slice(0, separator)) : '';
        var givenNames = separator >= 0 ? normalizeMrzNamePart(givenField) : fullName;

        return {
            fullName: fullName,
            givenNames: givenNames,
            surname: surname
        };
    }

    function isReadableMrzName(line, fullName) {
        var nameField = line.slice(5).replace(/<+$/g, '');
        var parts = fullName.split(/\s+/).filter(Boolean);
        return /[A-Z]{2,}<+[A-Z]{2,}/.test(nameField)
            && parts.length >= 2 && parts.length <= 6 && parts.every(function(part) {
                return part.length <= 20 && !/(.)\1{3,}/.test(part);
            });
    }

    function useMrzNameLine(details, line) {
        if (!details || !line || details.nameLooksReadable) return details;
        var parsedName = parseMrzName(line);
        if (!isReadableMrzName(line, parsedName.fullName)) return details;
        details.mrzLine1 = line;
        details.mrz = [line, details.mrzLine2].filter(Boolean).join('\n');
        details.fullName = parsedName.fullName;
        details.givenNames = parsedName.givenNames;
        details.surname = parsedName.surname;
        details.nameLooksReadable = true;
        details.score += 1;
        return details;
    }

    function parseMrzDetails(mrz, ui) {
        if (!mrz) return null;
        var first = mrz[0];
        var second = mrz[1];
        if ((first && !/^P[<A-Z][A-Z]{3}/.test(first)) || second.length !== 44) return null;
        var parsedName = parseMrzName(first);
        var fullName = parsedName.fullName;
        var normalizeMrzDigits = function(value) {
            return value.replace(/[OQD]/g, '0').replace(/[IL]/g, '1').replace(/S/g, '5').replace(/B/g, '8');
        };
        var checkDigit = function(value, digit) {
            var normalized = normalizeMrzDigits(digit);
            return /^\d$/.test(normalized) && mrzCheckDigit(value) === normalized;
        };
        var nationalityIndex = -1;
        Object.keys(nationalityToCountry).forEach(function(code) {
            var index = second.indexOf(code, 8);
            if (index >= 8 && index <= 13 && (nationalityIndex < 0
                || Math.abs(index - 10) < Math.abs(nationalityIndex - 10))) nationalityIndex = index;
        });
        if (nationalityIndex < 0) nationalityIndex = 10;
        var nationality = second.slice(nationalityIndex, nationalityIndex + 3);
        var passportEnd = nationalityIndex - 1;
        var birthStart = nationalityIndex + 3;
        var expiryStart = birthStart + 8;
        var passportField = second.slice(0, passportEnd);
        var birthField = normalizeMrzDigits(second.slice(birthStart, birthStart + 6));
        var expiryField = normalizeMrzDigits(second.slice(expiryStart, expiryStart + 6));
        var passportValid = passportEnd === 9 && checkDigit(passportField, second[passportEnd]);
        if (!passportValid && passportEnd === 9) {
            var correctedPassportField = passportField.charAt(0) + normalizeMrzDigits(passportField.slice(1));
            if (checkDigit(correctedPassportField, second[passportEnd])) {
                passportField = correctedPassportField;
                passportValid = true;
            }
        }
        var passportNumber = passportField.replace(/</g, '');
        var birthValid = checkDigit(birthField, second[birthStart + 6]);
        var expiryValid = checkDigit(expiryField, second[expiryStart + 6]);
        var dateOfBirth = birthValid ? parseMrzDate(birthField, true, ui.dateFormat) : '';
        var passportExpiry = expiryValid ? parseMrzDate(expiryField, false, ui.dateFormat) : '';
        var sexMarker = second.charAt(birthStart + 7);
        var sex = sexMarker === 'M' || sexMarker === 'F' ? sexMarker : '';
        var documentCode = first ? first.slice(0, 2).replace(/<+$/, '') : '';
        var issuingCountryCode = first && /^[A-Z]{3}$/.test(first.slice(2, 5)) ? first.slice(2, 5) : '';
        var nationalityCode = /^[A-Z]{3}$/.test(nationality) ? nationality : '';
        var optionalDataField = second.slice(28, 42);
        var optionalData = optionalDataField.replace(/<+$/, '');
        var optionalDataValid = Boolean(optionalData) && checkDigit(optionalDataField, second[42]);
        var compositeField = second.slice(0, 10) + second.slice(13, 20) + second.slice(21, 43);
        var compositeValid = checkDigit(compositeField, second[43]);
        var nameLooksReadable = isReadableMrzName(first, fullName);
        passportValid = passportValid && passportNumber.length >= 5;
        var verifiedCount = (passportValid ? 1 : 0) + (dateOfBirth ? 1 : 0) + (passportExpiry ? 1 : 0);
        var score = verifiedCount * 2 + (nameLooksReadable ? 1 : 0);

        return {
            mrz: [first, second].filter(Boolean).join('\n'),
            mrzLine1: first,
            mrzLine2: second,
            fullName: fullName,
            givenNames: parsedName.givenNames,
            surname: parsedName.surname,
            documentCode: documentCode,
            issuingCountryCode: issuingCountryCode,
            passportNumber: passportNumber,
            passportValid: passportValid,
            nationality: nationality,
            nationalityCode: nationalityCode,
            sex: sex,
            dateOfBirth: dateOfBirth,
            passportExpiry: passportExpiry,
            optionalData: optionalDataValid ? optionalData : '',
            checks: {
                passport: passportValid,
                dob: birthValid && Boolean(dateOfBirth),
                expiry: expiryValid && Boolean(passportExpiry),
                optionalData: optionalDataValid,
                composite: compositeValid
            },
            nameLooksReadable: nameLooksReadable,
            verifiedCount: verifiedCount,
            score: score
        };
    }

    function hasCompletePassportDetails(details) {
        return Boolean(details && details.verifiedCount === 3 && details.nameLooksReadable);
    }

    function hasUsablePassportDetails(details) {
        return Boolean(details && details.verifiedCount >= 2);
    }

    function isBetterMrzCandidate(candidate, current) {
        if (!candidate) return false;
        if (!current) return true;
        if (hasCompletePassportDetails(candidate) !== hasCompletePassportDetails(current)) {
            return hasCompletePassportDetails(candidate);
        }
        if (candidate.verifiedCount !== current.verifiedCount) return candidate.verifiedCount > current.verifiedCount;
        return candidate.score > current.score;
    }

    function findBestMrzDetails(text, ui) {
        var lines = String(text || '').split(/\r?\n/);
        var best = null;
        for (var index = 0; index < lines.length; index++) {
            var candidate = parseMrzDetails(findMrzLines(lines.slice(index).join('\n')), ui);
            if (isBetterMrzCandidate(candidate, best)) best = candidate;
            if (hasCompletePassportDetails(best)) break;
        }
        return best;
    }

    function keepReadableName(candidate, current) {
        if (!candidate || !current || candidate.nameLooksReadable || !current.nameLooksReadable
            || !candidate.dateOfBirth || candidate.dateOfBirth !== current.dateOfBirth
            || !candidate.passportExpiry || candidate.passportExpiry !== current.passportExpiry
            || candidate.nationalityCode !== current.nationalityCode) return candidate;
        candidate.fullName = current.fullName;
        candidate.givenNames = current.givenNames;
        candidate.surname = current.surname;
        candidate.mrzLine1 = current.mrzLine1;
        candidate.mrz = [candidate.mrzLine1, candidate.mrzLine2].filter(Boolean).join('\n');
        candidate.nameLooksReadable = true;
        candidate.score += 1;
        return candidate;
    }

    function fillField(selector, value) {
        var field = selector && findElement(selector);
        if (!field || !value) return;
        field.value = value;
        emitChange(field, 'input');
        emitChange(field, 'change');
    }

    function passportValues(details, ui) {
        var values = {};
        if (!details) return values;
        if (details.mrz) values.mrz = details.mrz;
        if (details.nameLooksReadable) {
            values.name = details.fullName;
            values.firstName = details.givenNames;
            values.lastName = details.surname;
        }
        if (details.passportValid) {
            values.passport = details.passportNumber;
            values.passportNo = details.passportNumber;
        }
        if (details.dateOfBirth) values.dob = details.dateOfBirth;
        if (details.passportExpiry) values.expiry = details.passportExpiry;
        if (details.documentCode) values.documentCode = details.documentCode;
        if (details.issuingCountryCode) values.issuingCountryCode = details.issuingCountryCode;
        if (details.nationalityCode) values.nationalityCode = details.nationalityCode;
        if (details.optionalData) values.optionalData = details.optionalData;
        if (details.sex) {
            values.sex = details.sex;
            values.gender = details.sex === 'M' ? 'male' : 'female';
            values.title = details.sex === 'M' ? 'MR' : 'MS';
        }

        var countryCode = nationalityToCountry[details.nationality];
        var countryName = countryCode && ui.countryNames[countryCode];
        if (countryName) values.nationality = countryName;

        return values;
    }

    function logScanResults(values, ui, details, accepted) {
        if (!ui.logResults || !window.console || typeof window.console.log !== 'function') return;
        var keys = ['accepted', 'verifiedCount', 'checks', 'mrz', 'passportNo', 'passport',
            'name', 'firstName', 'lastName', 'dob', 'expiry', 'sex', 'gender', 'title',
            'nationality', 'nationalityCode', 'documentCode', 'issuingCountryCode', 'optionalData'];
        var rows = keys.map(function(key) {
            var value = null;
            if (key === 'accepted') value = accepted;
            else if (key === 'verifiedCount') value = details ? details.verifiedCount : 0;
            else if (key === 'checks') value = details ? details.checks : null;
            else if (key === 'mrz') value = details && details.mrz ? details.mrz : null;
            else if (accepted && Object.prototype.hasOwnProperty.call(values, key)) value = values[key];
            return { field: key, value: value };
        });
        try { window.console.log('PassportScanner scan results', rows); }
        catch (error) { /* Console logging must not interrupt form filling. */ }
    }

    function applyPassportDetails(details, ui) {
        var values = passportValues(details, ui);

        var filledValues = new Map();
        Object.keys(values).forEach(function(key) {
            var field = ui.fields[key] && findElement(ui.fields[key]);
            if ((key === 'passport' || key === 'passportNo') && field === ui.resultTarget) return;
            if (!field || filledValues.get(field) === values[key]) return;
            fillField(field, values[key]);
            filledValues.set(field, values[key]);
        });

        setStatus(hasCompletePassportDetails(details)
            ? 'success'
            : 'partial',
            ui, hasCompletePassportDetails(details) ? 'success' : 'partial');
        logScanResults(values, ui, details, true);
        (ui.resultTarget || ui.element).dispatchEvent(new CustomEvent('passportscanner:result', {
            bubbles: true,
            detail: {
                fields: values,
                checks: details.checks,
                verifiedCount: details.verifiedCount,
                complete: hasCompletePassportDetails(details)
            }
        }));
    }

    function attachPassportImage(file, ui) {
        var input = ui.fields.passportImg && findElement(ui.fields.passportImg);
        if (!input || !file || !window.DataTransfer) return false;
        try {
            var transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
            ui.attachingPassportImage = true;
            try {
                emitChange(input, 'change');
            } finally {
                ui.attachingPassportImage = false;
            }
            return Boolean(input.files && input.files[0] && input.files[0].name === file.name && input.files[0].size === file.size);
        } catch (error) {
            return false;
        }
    }

    function captureCameraFrame(video) {
        var preview = video.getBoundingClientRect();
        var aspect = preview.width && preview.height ? preview.width / preview.height : 4 / 3;
        var sourceWidth = Math.min(video.videoWidth, video.videoHeight * aspect);
        var sourceHeight = sourceWidth / aspect;
        var canvas = document.createElement('canvas');
        canvas.width = Math.min(1600, Math.round(sourceWidth));
        canvas.height = Math.round(canvas.width / aspect);
        canvas.getContext('2d').drawImage(video,
            (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2,
            sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    function measureMrzSharpness(canvas, region) {
        var left = Math.round(canvas.width * (region ? region.left : 0));
        var top = Math.round(canvas.height * (region ? region.top : 0.78));
        var width = Math.max(2, Math.min(canvas.width - left, Math.round(canvas.width * (region ? region.width : 1))));
        var height = Math.max(2, Math.min(canvas.height - top, Math.round(canvas.height * (region ? region.height : 0.22))));
        var pixels = canvas.getContext('2d').getImageData(left, top, width, height).data;
        var total = 0;
        var count = 0;
        for (var y = 2; y < height - 2; y += 4) {
            for (var x = 2; x < width - 2; x += 4) {
                var index = (y * width + x) * 4;
                var horizontal = index + 8;
                var vertical = index + width * 8;
                var luminance = pixels[index] + pixels[index + 1] + pixels[index + 2];
                total += Math.abs(luminance - pixels[horizontal] - pixels[horizontal + 1] - pixels[horizontal + 2]);
                total += Math.abs(luminance - pixels[vertical] - pixels[vertical + 1] - pixels[vertical + 2]);
                count++;
            }
        }
        return count ? total / count : 0;
    }

    async function captureCameraSample(video, region) {
        var canvas = captureCameraFrame(video);
        var sharpness = measureMrzSharpness(canvas, region);
        var blob = await new Promise(function(resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.92); });
        return blob ? { file: new File([blob], 'passport-camera.jpg', { type: 'image/jpeg' }), sharpness: sharpness } : null;
    }

    function getCameraMrzRegion(ui) {
        var video = findElement(ui.video);
        var mrz = findElement(ui.mrzGuide);
        if (!video || !mrz) return null;
        var videoRect = video.getBoundingClientRect();
        var mrzRect = mrz.getBoundingClientRect();
        if (!videoRect.width || !videoRect.height || !mrzRect.width || !mrzRect.height) return null;
        var xPadding = mrzRect.width * 0.05;
        var yPadding = mrzRect.height * 0.25;
        var left = Math.max(0, (mrzRect.left - videoRect.left - xPadding) / videoRect.width);
        var top = Math.max(0, (mrzRect.top - videoRect.top - yPadding) / videoRect.height);
        var right = Math.min(1, (mrzRect.right - videoRect.left + xPadding) / videoRect.width);
        var bottom = Math.min(1, (mrzRect.bottom - videoRect.top + yPadding) / videoRect.height);
        if (right <= left || bottom <= top) return null;
        return { left: left, top: top, width: right - left, height: bottom - top };
    }

    async function scanImage(file, ui, options) {
        options = options || {};
        if (!file) return false;
        if (!options.silent) setStatus('reading', ui, 'scanning');
        var worker = options.worker;
        try {
            if (!worker) {
                var ocr = await withTimeout(ensureOcrLibrary(), 30000, 'Local passport scanner did not load in time.');
                var workerPromise = createOcrWorker(ocr);
                try {
                    worker = await withTimeout(workerPromise, 45000, 'Passport OCR took too long to start. Check your connection and try again.');
                } catch (error) {
                    workerPromise.then(function(createdWorker) { return createdWorker.terminate(); }).catch(function() {});
                    throw error;
                }
            }
            async function readNameLine(crop, details) {
                if (!hasUsablePassportDetails(details) || details.nameLooksReadable || !worker.setParameters) return details;
                try {
                    await worker.setParameters({
                        tessedit_pageseg_mode: 7,
                        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
                    });
                    var nameCrop = await prepareMrzNameCrop(crop);
                    var nameResult = await withTimeout(worker.recognize(nameCrop), options.camera ? 15000 : 45000,
                        'Passport name OCR timed out.');
                    if (activeUi === ui) useMrzNameLine(details, findMrzNameLine(nameResult.data.text || ''));
                } catch (error) {
                    // The verified fields remain usable when the optional name pass fails.
                }
                return details;
            }
            async function readOrientation(imageFile) {
                var best = null;
                var croppedImage = null;
                if (options.camera && window.createImageBitmap) {
                    if (worker.setParameters) {
                        await worker.setParameters({ tessedit_pageseg_mode: 6, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<' });
                    }
                    var cameraCrop = await prepareMrzCrop(imageFile, options.cropRegion);
                    var cameraResult = await withTimeout(worker.recognize(cameraCrop), 15000, 'Passport OCR timed out.');
                    if (activeUi !== ui) return null;
                    best = findBestMrzDetails(cameraResult.data.text || '', ui);
                    if (hasCompletePassportDetails(best) || options.cropOnly) return readNameLine(cameraCrop, best);
                    croppedImage = cameraCrop;
                }
                // Crop-specific OCR settings persist on the Tesseract worker, so reset them for every pass.
                if (worker.setParameters) {
                    await worker.setParameters({ tessedit_pageseg_mode: 3, tessedit_char_whitelist: '' });
                }
                var result = await withTimeout(worker.recognize(imageFile), options.camera ? 15000 : 45000, 'Passport OCR timed out. Try a smaller or clearer image.');
                if (activeUi !== ui) return null;
                var fullDetails = findBestMrzDetails(result.data.text || '', ui);
                if (isBetterMrzCandidate(fullDetails, best)) best = fullDetails;
                if (options.camera) return readNameLine(croppedImage, best);
                if (hasUsablePassportDetails(best) && !best.nameLooksReadable && window.createImageBitmap) {
                    croppedImage = await prepareMrzCrop(imageFile);
                    return readNameLine(croppedImage, best);
                }
                if ((!best || !best.passportValid) && window.createImageBitmap) {
                    if (worker.setParameters) {
                        await worker.setParameters({
                            tessedit_pageseg_mode: 6,
                            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'
                        });
                    }
                    croppedImage = await prepareMrzCrop(imageFile);
                    result = await withTimeout(worker.recognize(croppedImage), 45000, 'Passport OCR timed out. Try a smaller or clearer image.');
                    if (activeUi !== ui) return null;
                    var croppedDetails = findBestMrzDetails(result.data.text || '', ui);
                    if (isBetterMrzCandidate(croppedDetails, best)) best = croppedDetails;
                    if ((!best || !best.passportValid) && worker.setParameters) {
                        await worker.setParameters({ tessedit_pageseg_mode: 11 });
                        result = await withTimeout(worker.recognize(croppedImage), 45000, 'Passport OCR timed out. Try a smaller or clearer image.');
                        if (activeUi !== ui) return null;
                        var sparseDetails = findBestMrzDetails(result.data.text || '', ui);
                        if (isBetterMrzCandidate(sparseDetails, best)) best = sparseDetails;
                    }
                }
                return croppedImage ? readNameLine(croppedImage, best) : best;
            }

            var details = await readOrientation(file);
            if (!options.camera && (!hasUsablePassportDetails(details) || !details.nameLooksReadable) && window.createImageBitmap) {
                for (var rotation of [90, 180, 270]) {
                    var rotatedImage = await rotateImage(file, rotation);
                    var rotatedDetails = await readOrientation(rotatedImage);
                    if (isBetterMrzCandidate(rotatedDetails, details)) details = rotatedDetails;
                    if (hasUsablePassportDetails(details) && details.nameLooksReadable) break;
                    if (activeUi !== ui) return;
                }
            }
            if (options.isCurrent && !options.isCurrent()) return false;
            if (options.onCandidate) options.onCandidate(details);
            if (!hasUsablePassportDetails(details)) {
                if (options.autoCapture) return false;
                logScanResults(passportValues(details, ui), ui, details, false);
                var unreadable = new Error(statusTranslations.en.unreadable);
                unreadable.statusKey = 'unreadable';
                throw unreadable;
            }
            if (options.previewOnly) return details;
            if (activeUi !== ui) return false;
            applyPassportDetails(details, ui);
            return true;
        } catch (error) {
            if (options.onCandidate && (!options.isCurrent || options.isCurrent())) options.onCandidate(null);
            if (options.worker && /timed out/i.test((error && error.message) || '')) {
                var failedWorker = autoScanWorkerPromise;
                autoScanWorkerPromise = null;
                if (failedWorker) failedWorker.then(function(currentWorker) { return currentWorker.terminate(); }).catch(function() {});
            }
            if (!options.silent && activeUi === ui) setStatus(error && error.statusKey || 'scanFailed', ui, 'error');
            return false;
        } finally {
            if (worker && !options.worker) await worker.terminate();
        }
    }

    function scheduleAutoScan(ui, delay) {
        if (autoScanTimer) clearTimeout(autoScanTimer);
        var sequence = cameraSequence;
        autoScanTimer = setTimeout(function() { autoScanFrame(ui, sequence); }, delay);
    }

    async function autoScanFrame(ui, sequence) {
        if (activeUi !== ui || !activeVideo || sequence !== cameraSequence) return;
        if (autoScanBusy) {
            scheduleAutoScan(ui, 500);
            return;
        }
        if (!activeVideo.videoWidth || !activeVideo.videoHeight) {
            scheduleAutoScan(ui, 500);
            return;
        }

        var video = activeVideo;
        autoScanBusy = true;
        var retryDelay = 1200;
        var candidate = false;
        try {
            var cropRegion = getCameraMrzRegion(ui);
            var initialSample = await captureCameraSample(video, cropRegion);
            if (initialSample && activeUi === ui && activeVideo === video && sequence === cameraSequence) {
                setStatus('starting', ui, 'scanning');
                var worker = await getAutoScanWorker();
                if (activeUi !== ui || activeVideo !== video || sequence !== cameraSequence) return;
                setStatus('reading', ui, 'scanning');
                var found = await scanImage(initialSample.file, ui, {
                    camera: true,
                    autoCapture: true,
                    previewOnly: true,
                    cropRegion: cropRegion,
                    worker: worker,
                    silent: true,
                    isCurrent: function() { return activeUi === ui && activeVideo === video && sequence === cameraSequence; },
                    onCandidate: function(details) {
                        candidate = hasUsablePassportDetails(details);
                        setCameraGuideState(ui, candidate ? 'steady' : 'invalid');
                    }
                });
                if (found && activeUi === ui && activeVideo === video && sequence === cameraSequence) {
                    var best = { sample: initialSample, details: found };
                    var heldSamples = [];
                    var heldCount = ui.autoCaptureCount - 1;
                    var holdMs = ui.autoCaptureHoldSeconds * 1000;
                    var holdStart = Date.now();
                    setCameraGuideState(ui, 'steady');
                    setStatus(heldCount === 0 ? 'capturing'
                        : holdMs === 0 ? 'capturingMany' : 'hold', ui, 'scanning',
                        { count: ui.autoCaptureCount, seconds: ui.autoCaptureHoldSeconds });
                    for (var i = 1; i <= heldCount; i++) {
                        var captureAt = holdStart + Math.round(holdMs * i / heldCount);
                        await new Promise(function(resolve) { setTimeout(resolve, Math.max(0, captureAt - Date.now())); });
                        if (activeUi !== ui || activeVideo !== video || sequence !== cameraSequence) return;
                        var heldSample = await captureCameraSample(video, cropRegion);
                        if (heldSample) heldSamples.push(heldSample);
                        if (i < heldCount && holdMs > 0) {
                            var remainingSeconds = Math.max(1, Math.ceil((holdStart + holdMs - Date.now()) / 1000));
                            setStatus('hold', ui, 'scanning', { seconds: remainingSeconds });
                        }
                    }
                    if (!hasCompletePassportDetails(best.details)) {
                        setStatus('comparing', ui, 'scanning');
                        heldSamples.sort(function(a, b) { return b.sharpness - a.sharpness; });
                        for (var j = 0; j < heldSamples.length; j++) {
                            if (activeUi !== ui || activeVideo !== video || sequence !== cameraSequence) return;
                            try {
                                worker = await getAutoScanWorker();
                                var extraDetails = await scanImage(heldSamples[j].file, ui, {
                                    camera: true,
                                    autoCapture: true,
                                    previewOnly: true,
                                    cropOnly: true,
                                    cropRegion: cropRegion,
                                    worker: worker,
                                    silent: true,
                                    isCurrent: function() { return activeUi === ui && activeVideo === video && sequence === cameraSequence; }
                                });
                                if (extraDetails && isBetterMrzCandidate(extraDetails, best.details)) {
                                    best = { sample: heldSamples[j], details: keepReadableName(extraDetails, best.details) };
                                }
                                if (hasCompletePassportDetails(best.details)) break;
                            } catch (error) {
                                // Keep the first verified frame if a later comparison cannot be read.
                            }
                        }
                    }
                    if (activeUi !== ui || activeVideo !== video || sequence !== cameraSequence) return;
                    applyPassportDetails(best.details, ui);
                    var imageExpected = Boolean(ui.fields.passportImg);
                    var attached = imageExpected && attachPassportImage(best.sample.file, ui);
                    var complete = hasCompletePassportDetails(best.details);
                    setStatus(imageExpected && !attached
                        ? 'imageMissing'
                        : complete
                            ? 'success'
                            : 'partial',
                        ui, imageExpected && !attached || !complete ? 'partial' : 'success');
                    stopCamera();
                    return;
                }
            }
        } catch (error) {
            if (activeUi === ui && sequence === cameraSequence) setCameraGuideState(ui, 'invalid');
            if (activeUi === ui && sequence === cameraSequence) setStatus('autoFailed', ui, 'error');
            retryDelay = 5000;
        } finally {
            autoScanBusy = false;
        }

        if (activeUi === ui && activeVideo === video && sequence === cameraSequence) {
            if (retryDelay === 1200) setStatus(candidate
                ? 'found'
                : 'position', ui, 'scanning');
            scheduleAutoScan(ui, retryDelay);
        }
    }

    function detectCamera(ui) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices || !navigator.mediaDevices.getUserMedia) return;
        navigator.mediaDevices.enumerateDevices().then(function(devices) {
            if (devices.some(function(device) { return device.kind === 'videoinput'; })) {
                if (activeUi === ui) findElement(ui.cameraOpen).hidden = false;
            }
        }).catch(function() {});
    }

    async function init(config) {
        config = config || {};
        var base = config.assetBaseUrl || detectedAssetBaseUrl;
        assetBaseUrl = base ? new URL(String(base).endsWith('/') ? base : base + '/', document.baseURI).href : null;
        stopCamera();
        clearUploadListener();
        activeUi = null;
        var container = findElement(config.container);
        if (!container) return;
        container.hidden = true;
        container.replaceChildren();
        if (!document.documentElement.contains(container)) return;
        if (config.fieldRoot) {
            var root = typeof config.fieldRoot === 'string' ?
                (container.closest ? container.closest(config.fieldRoot) : null) : findElement(config.fieldRoot);
            Object.keys(config.fields || {}).forEach(function(key) {
                if (typeof config.fields[key] === 'string') {
                    config.fields[key] = root && root.querySelector(config.fields[key]);
                }
            });
        }
        var ui = buildScannerUi(config, container);
        if (!ui) return;
        container.hidden = false;
        activeUi = ui;

        findElement(ui.cameraOpen).addEventListener('click', async function() {
            try {
                if (cameraOwner && cameraOwner !== scannerApi) cameraOwner.stopCamera();
                stopCamera();
                cameraOwner = scannerApi;
                var stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    }
                });
                var video = document.querySelector(ui.video);
                if (cameraOwner !== scannerApi || activeUi !== ui || !video ||
                    !document.documentElement.contains(video)) {
                    stream.getTracks().forEach(function(track) { track.stop(); });
                    return;
                }
                activeStream = stream;
                activeVideo = video;
                activeVideo.srcObject = activeStream;
                setCameraGuideState(ui, 'neutral');
                findElement(ui.cameraPanel).hidden = false;
                await activeVideo.play();
                if (activeUi === ui) {
                    setStatus('looking', ui, 'scanning');
                    scheduleAutoScan(ui, 700);
                }
            } catch (error) {
                if (activeUi === ui) {
                    stopCamera();
                    setStatus('cameraFailed', ui, 'error');
                }
            }
        });
        findElement(ui.cameraClose).addEventListener('click', stopCamera);
        findElement(ui.chooseButton).addEventListener('click', function() {
            findElement(ui.scanInput).click();
        });
        if (ui.fields.passportImg) {
            activeUploadInput = findElement(ui.fields.passportImg);
            activeUploadListener = function() {
                var file = this.files && this.files[0];
                if (!file || activeUi !== ui || ui.attachingPassportImage) return;
                if (file.type === 'application/pdf') {
                    setStatus('pdf', ui, 'error');
                    return;
                }
                scanImage(file, ui);
            };
            if (activeUploadInput) activeUploadInput.addEventListener('change', activeUploadListener);
        }
        findElement(ui.captureButton).addEventListener('click', function() {
            if (autoScanTimer) {
                clearTimeout(autoScanTimer);
                autoScanTimer = null;
            }
            if (!activeVideo || !activeVideo.videoWidth || !activeVideo.videoHeight) {
                setStatus('cameraStarting', ui, 'scanning');
                return;
            }
            var cropRegion = getCameraMrzRegion(ui);
            var canvas = captureCameraFrame(activeVideo);
            var captureSequence = cameraSequence;
            canvas.toBlob(function(blob) {
                if (activeUi !== ui || captureSequence !== cameraSequence) return;
                stopCamera();
                if (blob) {
                    var imageFile = new File([blob], 'passport-camera.jpg', { type: 'image/jpeg' });
                    var attachmentFailed = Boolean(ui.fields.passportImg) && !attachPassportImage(imageFile, ui);
                    scanImage(imageFile, ui, { camera: true, cropRegion: cropRegion }).then(function(scanned) {
                        if (scanned && attachmentFailed && activeUi === ui) {
                            setStatus('imageMissing', ui, 'partial');
                        }
                    });
                }
                else setStatus('captureFailed', ui, 'error');
            }, 'image/jpeg', 0.92);
        });
        findElement(ui.scanInput).addEventListener('change', async function() {
            var file = this.files && this.files[0];
            this.value = '';
            if (!file) return;
            try {
                if (file.type === 'image/webp' || /\.webp$/i.test(file.name || '')) setStatus('preparing', ui, 'scanning');
                var uploadFile = await normalizeSelectedImage(file);
                if (activeUi !== ui) return;
                var attachmentFailed = Boolean(ui.fields.passportImg) && !attachPassportImage(uploadFile, ui);
                scanImage(uploadFile, ui).then(function(scanned) {
                    if (scanned && attachmentFailed && activeUi === ui) {
                        setStatus('imageMissing', ui, 'partial');
                    }
                });
            } catch (error) {
                setStatus('imageFailed', ui, 'error');
            }
        });

        detectCamera(ui);
    }

    scannerApi = { init: init, stop: stop, stopCamera: stopCamera };
    return scannerApi;
    }

    function initFromElement(element) {
        element = findElement(element);
        if (!element) return;
        var storedConfig = element.getAttribute('data-tjaup-passportscanner');
        var config = {};
        if (storedConfig) {
            try { config = JSON.parse(storedConfig); }
            catch (error) { return; }
        }
        var isInput = element.tagName === 'INPUT';
        var names = {
            mrz: 'mrz',
            name: 'name',
            firstName: 'first-name',
            lastName: 'last-name',
            title: 'title',
            gender: 'gender',
            passport: 'passport',
            passportNo: 'passport-no',
            dob: 'dob',
            expiry: 'expiry',
            nationality: 'nationality',
            documentCode: 'document-code',
            issuingCountryCode: 'issuing-country-code',
            nationalityCode: 'nationality-code',
            sex: 'sex',
            optionalData: 'optional-data',
            passportImg: 'passport-img'
        };
        var fields = Object.assign({}, config.fields || {});
        Object.keys(names).forEach(function(key) {
            var selector = element.getAttribute('data-field-' + names[key]);
            if (selector) fields[key] = selector;
        });
        var container = element;
        if (isInput) {
            container = element._passportScannerContainer;
            if (!container || !document.documentElement.contains(container)) {
                var next = element.nextElementSibling;
                container = next && next.getAttribute &&
                    next.getAttribute('data-tjaup-passportscanner-container') !== null ? next : null;
                if (!container) {
                    container = document.createElement('div');
                    element.insertAdjacentElement('afterend', container);
                }
            }
            element._passportScannerContainer = container;
        }
        config.container = container;
        config.fields = fields;
        config.resultTarget = isInput ? element : null;
        var dateFormat = element.getAttribute('data-date-format');
        var autoCaptureCount = element.getAttribute('data-auto-capture-count');
        var autoCaptureHoldSeconds = element.getAttribute('data-auto-capture-hold-seconds');
        var logResults = element.getAttribute('data-log-results');
        var language = element.getAttribute('data-language');
        var statusMessages = element.getAttribute('data-status-messages');
        var fieldRoot = element.getAttribute('data-field-root');
        var assetBaseUrl = element.getAttribute('data-asset-base-url');
        var countryNames = element.getAttribute('data-country-names');
        if (dateFormat) config.dateFormat = dateFormat;
        if (autoCaptureCount) config.autoCaptureCount = autoCaptureCount;
        if (autoCaptureHoldSeconds) config.autoCaptureHoldSeconds = autoCaptureHoldSeconds;
        if (logResults !== null) config.logResults = logResults === 'true';
        if (language) config.language = language;
        if (statusMessages) {
            try { config.statusMessages = JSON.parse(statusMessages); }
            catch (error) { config.statusMessages = {}; }
        }
        if (fieldRoot) config.fieldRoot = fieldRoot;
        if (assetBaseUrl) config.assetBaseUrl = assetBaseUrl;
        if (countryNames) {
            try { config.countryNames = JSON.parse(countryNames); }
            catch (error) { config.countryNames = {}; }
        }
        container._passportScannerInput = element;
        initializedInputs.add(element);
        return init(config);
    }

    function init(config) {
        var container = findElement(config && config.container);
        if (!container || !document.documentElement.contains(container)) return Promise.resolve();
        var scanner = instances.get(container);
        if (!scanner) {
            scanner = createScanner();
            instances.set(container, scanner);
        }
        var options = Object.assign({}, config);
        options.fields = Object.assign({}, config.fields || {});
        return scanner.init(options);
    }

    function stop(target) {
        if (target == null) {
            instances.forEach(function(scanner) { scanner.stop(); });
            return;
        }
        var element = findElement(target);
        var container = instances.has(element) ? element : element && element._passportScannerContainer;
        if (container && instances.has(container)) instances.get(container).stop();
    }

    function release(container) {
        var scanner = instances.get(container);
        if (!scanner) return;
        scanner.stop();
        instances.delete(container);
        if (container._passportScannerInput) initializedInputs.delete(container._passportScannerInput);
    }

    function autoInit() {
        var selector = 'input.js-tjaup-passportscanner-input, input[data-tjaup-passportscanner]';
        var elements = document.querySelectorAll ? document.querySelectorAll(selector) :
            [document.querySelector('input.js-tjaup-passportscanner-input')];
        Array.prototype.forEach.call(elements, function(element) {
            if (element && !initializedInputs.has(element)) initFromElement(element);
        });
    }

    function startObserver() {
        if (lifecycleObserver || !document.body || !window.MutationObserver) return;
        lifecycleObserver = new window.MutationObserver(function() {
            instances.forEach(function(scanner, container) {
                if (!document.documentElement.contains(container)) release(container);
            });
            autoInit();
        });
        lifecycleObserver.observe(document.body, { childList: true, subtree: true });
    }

    function start() {
        autoInit();
        startObserver();
    }

    var api = { init: init, initFromElement: initFromElement, stop: stop };
    window.PassportScanner = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})(window);
