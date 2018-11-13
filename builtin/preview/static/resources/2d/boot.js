(function() {
    ('use strict');
    // abbreviation for querySelector
    const q = document.querySelector.bind(document);

    // dom element
    const canvas = q('#GameCanvas');
    const select = q('#opts-device');
    const optsDebugMode = q('#opts-debug-mode');
    const rotateBtn = q('#btn-rotate');
    const pauseBtn = q('#btn-pause');
    const stepBtn = q('#btn-step');
    const showFPSBtn = q('#btn-show-fps');
    const recompileBtn = q('#btn-recompile');
    const inputSetFPS = q('#input-set-fps');
    const progressBar = q('#splash .progress-bar span');
    let splash = null;
    let inited = false;

    // init device resolutions
    const devices = [
        { name: 'Apple iPad', width: 1024, height: 768, ratio: 2 },
        { name: 'Apple iPad Mini', width: 1024, height: 768, ratio: 1 },
        { name: 'Apple iPhone 4', width: 320, height: 480, ratio: 2 },
        { name: 'Apple iPhone 5', width: 320, height: 568, ratio: 2 },
        { name: 'Apple iPhone 6', width: 375, height: 667, ratio: 2 },
        { name: 'Apple iPhone 6 Plus', width: 414, height: 736, ratio: 3 },
        { name: 'Huawei P9', width: 540, height: 960, ratio: 2 },
        { name: 'Huawei Mate9 Pro', width: 720, height: 1280, ratio: 2 },
        { name: 'Goolge Nexus 4', width: 384, height: 640, ratio: 2 },
        { name: 'Goolge Nexus 5', width: 360, height: 640, ratio: 3 },
        { name: 'Goolge Nexus 6', width: 412, height: 732, ratio: 3.5 },
        { name: 'Goolge Nexus 7', width: 960, height: 600, ratio: 2 }
    ];

    let scene = null;
    let rotated = false;

    /**
     * toggle element class
     * @param {HTMLElement} element
     * @param {string} className
     * @param {boolean | undefined} add
     */
    function toggleElementClass(element, className, add) {
        const isAdd = add === undefined ? !element.classList.contains(className) : add;
        if (isAdd) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }

    /**
     * initialize select option
     */
    function initSelect() {
        devices.map((device, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.text = device.name;
            select.add(option);
        });
    }

    /**
     * get layout size and show loading
     */
    function showLoading(flag) {
        if (!splash) {
            const { width, height } = getEmulatedScreenSize();
            splash = q('#splash');
            const gameContainer = q('#GameDiv');

            splash.style.width = `${width}px`;
            splash.style.height = `${height}px`;
            splash.style.display = '';
            progressBar.style.width = '0%';
            if (width < height) {
                splash.style.backgroundImage = `url("./img/splash_portrait.png")`;
            }
            if (gameContainer) {
                gameContainer.style.visibility = 'visible';
            }

            canvas.width = width;
            canvas.height = height;
        } else {
            if (flag) {
                splash.style.display = '';
            } else {
                splash.style.display = none;
            }
        }
    }

    /**
     * get emulated screen size
     * @returns {{width: number, height: number}}
     */
    function getEmulatedScreenSize() {
        const value = select.value;
        const { width, height } = value !== '0' ? devices[value - 1] : { width: 960, height: 480 };

        return rotated ? { height: width, width: height } : { width, height };
    }

    function initPreviewOptions() {
        initSelect();
        showLoading();
        inputSetFPS.value = '60';
    }

    initPreviewOptions();

    // 全局入口
    window.onload = function() {
        onload();
    };
    // 检查是否为空场景
    function checkEmptyScene() {
        let scene = cc.director.getScene();
        if (scene) {
            if (scene.children.length > 1) {
                return;
            }
            if (scene.children.length === 1) {
                var node = scene.children[0];
                if (node.children.length > 0) {
                    return;
                }
                if (node._components.length > 1) {
                    return;
                }
                if (node._components.length > 0 && !(node._components[0] instanceof cc.Canvas)) {
                    return;
                }
            }
        }
        q('#bulletin').style.display = 'block';
        q('#sceneIsEmpty').style.display = 'block';
    }

    // 绑定相关按钮处理事件
    function handles() {
        rotateBtn.addEventListener('click', function() {
            rotated = !rotated;
            toggleElementClass(rotateBtn, 'checked');
            updateResolution();
        });

        select.addEventListener('change', function() {
            updateResolution();
        });

        // init show fps, true by default
        showFPSBtn.addEventListener('click', function() {
            let show = !cc.debug.isDisplayStats();
            cc.debug.setDisplayStats(show);
            toggleElementClass(showFPSBtn, 'checked');
        });

        // init pause button
        pauseBtn.addEventListener('click', function() {
            let shouldPause = !cc.game.isPaused();
            if (shouldPause) {
                cc.game.pause();
            } else {
                cc.game.resume();
            }
            toggleElementClass(pauseBtn, 'checked');
            toggleElementClass(stepBtn, 'show');
        });

        // init debug modes
        optsDebugMode.addEventListener('change', function(event) {
            var value = event.target.value;
            cc.debug._resetDebugSetting(parseInt(value, 10));
        });

        // init set fps
        inputSetFPS.addEventListener('change', function(event) {
            let fps = parseInt(inputSetFPS.value, 10);
            if (isNaN(fps)) {
                fps = 60;
                inputSetFPS.value = fps.toString();
            }
            cc.game.setFrameRate(fps);
        });

        // init recompile button
        recompileBtn.addEventListener('click', function() {
            var url = window.location.href + 'update-db';
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() {
                if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
                    document.getElementById('recompiling').style.display = 'block';
                }
            };
            xmlHttp.open('GET', url, true); // true for asynchronous
            xmlHttp.send(null);
        });

        // init step button
        stepBtn.addEventListener('click', function() {
            cc.game.step();
        });
    }

    // 监听用户的刷新行为
    function monitorRefresh() {
        // socket
        // =======================
        let socket = io();
        socket.on('browser:reload', function() {
            window.location.reload();
        });
        socket.on('browser:confirm-reload', function() {
            let r = confirm('Reload?');
            if (r) {
                window.location.reload();
            }
        });
    }

    // 更新屏幕分辨率
    function updateResolution() {
        const { width, height } = getEmulatedScreenSize();
        const gameDiv = q('#GameDiv');
        const gameContainer = q('#GameContainer');
        gameDiv.style.width = gameContainer.style.width = `${width}px`;
        gameDiv.style.height = gameContainer.style.height = `${height}px`;
        if (cc && cc.game.canvas) {
            cc.view.setCanvasSize(width, height);
        }
    }

    /**
     *
     * 读取当前场景 json 数据
     */
    function getCurrentScene() {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.responseType = 'text';
            request.addEventListener('load', (req) => {
                if (request.status === 200) {
                    resolve(request.response);
                }
            });
            request.open('GET', 'current-scene', 'true');
            request.send();
        });
    }

    /**
     * 初始化打开场景
     *
     * @param {*} res
     */
    async function initScene() {
        if (inited) {
            return;
        }
        cc.loader.onProgress = function(completedCount, totalCount, item) {
            var percent = 100 * completedCount / totalCount;
            if (progressBar) {
                progressBar.style.width = percent.toFixed(2) + '%';
            }
        };
        // canvas 透明模式
        cc.macro.ENABLE_TRANSPARENT_CANVAS = true;

        // 配置资源路径等
        const AssetOptions = {
            libraryPath: 'res/import',
            rawAssetsBase: 'res/raw-',
            rawAssets: SETTING.rawAssets,
        };

        // jsList
        let jsList = SETTING.jsList || [];
        jsList = jsList.map(function(x) { return AssetOptions.rawAssetsBase + x; });
        if (SETTING.jsBundleForWebPreview) {
            jsList.push(SETTING.jsBundleForWebPreview);
        }

        window.__modular.init(SETTING.scripts);
        jsList = jsList.concat(window.__modular.srcs);

        // 初始化引擎配置
        const option = {
            id: canvas,
            showFPS: false,
            scenes: SETTING.scenes,
            debugMode: cc.debug.DebugMode.ERROR_FOR_WEB_PAGE,
            frameRate: parseInt(inputSetFPS.value, 10),
            renderMode: 2, // 0: auto, 1:Canvas, 2:Webgl
            registerSystemEvent: false,
            jsList: jsList,
            noCache: false,
            groupList: SETTING.groupList,
            collisionMatrix: SETTING.collisionMatrix,
        };

        // 等待引擎启动
        await new Promise((resolve) => {
            cc.game.run(option, resolve);
        });
        window.__modular.run();

        cc.view.enableRetina(false);
        cc.debug.setDisplayStats(true);

        cc.game.canvas.style.imageRendering = 'pixelated';

        cc.game.canvas.setAttribute('tabindex', -1);
        cc.game.canvas.style.backgroundColor = '';
        cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, () => {
            splash.style.display = 'none';

            // HACK Camera 的缩放有问题，待解决
            cc.Camera.main.ortho = false;

            checkEmptyScene();
            inited = true;
        });

        cc.game.pause();

        let json = await getCurrentScene();
        // init assets
        cc.AssetLibrary.init(AssetOptions);
        cc.AssetLibrary.loadJson(json,
            (err, sceneAsset) => {
                if (err) {
                    cc.error(err.stack);
                    return;
                }
                scene = sceneAsset.scene;
                scene._name = sceneAsset._name;
                cc.director.runSceneImmediate(scene, function() {
                    cc.game.resume();
                });

                cc.loader.onProgress = null;
            }
        );

        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });
    }

    function initSetting() {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.responseType = 'text';
            request.addEventListener('load', (req) => {
                if (request.status === 200) {
                    window.SETTING = JSON.parse(request.response);
                    resolve(request.response);
                }
            });
            request.open('GET', 'setting.json', 'true');
            request.send();
        });
    }
    // 入口函数
    async function onload() {
        // init Setting
        await initSetting();
        // 初始化 canvas 大小
        updateResolution();
        // init operation event
        handles();
        // load scene file
        initScene();
        // 监听刷新
        monitorRefresh();
    }
})();
