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
    let devices = {};
    let scene = null;
    let rotated = false;

    const isMobile = function() {
        var check = false;
        (function(a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {check = true;
         }})(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    };

    function isFullScreen() {
        let toolbar = document.getElementsByClassName('toolbar')[0];
        return getComputedStyle(toolbar).display === 'none';
    }

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
    async function initSelect() {
        devices = await getDevices();
        Object.keys(devices).forEach((key) => {
            const option = document.createElement('option');
            option.value = key;
            option.text = devices[key].name;
            select.add(option);
            select.value = 'customize';
        });
    }

    // 获取支持的设备列表
    function getDevices() {
        return new Promise((resolve) => {
            const request = new XMLHttpRequest();
            request.responseType = 'text';
            request.addEventListener('load', (req) => {
                if (request.status === 200) {
                    resolve(JSON.parse(request.response));
                }
            });
            request.open('GET', 'get-devices', 'true');
            request.send();
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
            splash.style.width = `${Math.min(width, screen.width)}px`;
            splash.style.height = `${Math.min(height, screen.height)}px`;
            splash.style.display = '';
            progressBar.style.width = '0%';

            if (splash.style.width < splash.style.height) {
                splash.style.backgroundImage = `url("./../splash_portrait.png")`;
            }
            if (gameContainer) {
                gameContainer.style.visibility = 'visible';
            }

            if (!isMobile()) {
                // make the splash screen in center
                canvas.width = width;
                canvas.height = height;
            }
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
        let width; let height;
        if (isFullScreen()) {
            height = screen.height;
            width = screen.width;
            return rotated ? { height: width, width: height } : { width, height };
        }
        // 当前分辨路为非自定义
        if (!select.value || select.value === 'customize') {
            // 当前模式为自定义
            let {designWidth, designHeight} = window._CCSettings;
            width = designWidth || 960;
            height = designHeight || 480;
        } else {
             width = devices[select.value].width;
             height = devices[select.value].height;
        }

        return rotated ? { height: width, width: height } : { width, height };
    }

    function initPreviewOptions() {
        initSelect();
        showLoading();
        inputSetFPS.value = '60';
    }

    // 全局入口
    window.onload = function() {
        if (window.__quick_compile__) {
            window.__quick_compile__.load(onload);
        } else {
            onload();
        }
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
        // init title
        document.title = _CCSettings.title;

        rotateBtn.addEventListener('click', function() {
            rotated = !rotated;
            toggleElementClass(rotateBtn, 'checked');
            updateResolution();
        });

        select.addEventListener('change', function(event) {
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

        if (isFullScreen()) {
            window.addEventListener('resize', updateResolution);
        }
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

    /**
     * 更新屏幕分辨率
     */
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
                    resolve(JSON.parse(request.response));
                }
            });
            request.open('GET', 'current-scene.json', 'true');
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
            rawAssets: window._CCSettings.rawAssets,
        };

        // jsList
        let jsList = window._CCSettings.jsList || [];
        jsList = jsList.map(function(x) { return AssetOptions.rawAssetsBase + x; });
        if (window._CCSettings.jsBundleForWebPreview) {
            jsList.push(window._CCSettings.jsBundleForWebPreview);
        }

        window.__modular.init(window._CCSettings.scripts);
        jsList = jsList.concat(window.__modular.srcs);

        // 初始化引擎配置
        const option = {
            id: canvas,
            showFPS: false,
            scenes: window._CCSettings.scenes,
            debugMode: parseInt(optsDebugMode.value, 10),
            frameRate: parseInt(inputSetFPS.value, 10),
            jsList: jsList,
            groupList: window._CCSettings.groupList,
            collisionMatrix: window._CCSettings.collisionMatrix,
        };

        // 等待引擎启动
        await new Promise((resolve) => {
            cc.game.run(option, resolve);
        });
        window.__modular.run();

        cc.view.enableRetina(true);
        cc.debug.setDisplayStats(true);

        cc.game.canvas.style.imageRendering = 'pixelated';

        cc.game.canvas.setAttribute('tabindex', -1);
        cc.game.canvas.style.backgroundColor = '';
        cc.director.once(cc.Director.EVENT_AFTER_SCENE_LAUNCH, () => {
            splash.style.display = 'none';

            checkEmptyScene();
            inited = true;
        });

        cc.game.pause();

        let json = await getCurrentScene();
        // init assets
        cc.AssetLibrary.init(AssetOptions);

         // load stashed scene
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

        updateResolution();
    }

    // 入口函数
    async function onload() {
        // 初始化 select 选项设置
        initPreviewOptions();
        // 初始化 canvas 大小
        // updateResolution();
        // init operation event
        handles();
        // load scene file
        initScene();
        // 监听刷新
        monitorRefresh();
    }
})();
