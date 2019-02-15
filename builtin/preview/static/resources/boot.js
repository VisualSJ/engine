(function() {
    ('use strict');
    // abbreviation for querySelector
    const q = document.querySelector.bind(document);

    // dom element
    const $msgContainer = q('#msgContainer');
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
    const DEVICES = {
        default: { name: 'default', height: 960, width: 640},
        ipad: { name: 'Apple iPad', width: 1024, height: 768, ratio: 2 },
        ipad_mini: { name: 'Apple iPad Mini', width: 1024, height: 768, ratio: 1 },
        iPhone4: { name: 'Apple iPhone 4', width: 320, height: 480, ratio: 2 },
        iPhone5: { name: 'Apple iPhone 5', width: 320, height: 568, ratio: 2 },
        iPhone6: { name: 'Apple iPhone 6', width: 375, height: 667, ratio: 2 },
        iPhone6_plus: { name: 'Apple iPhone 6 Plus', width: 414, height: 736, ratio: 3 },
        huawei9: { name: 'Huawei P9', width: 540, height: 960, ratio: 2},
        huawei_mate9_pro: { name: 'Huawei Mate9 Pro', width: 720, height: 1280, ratio: 2},
        nexu4: { name: 'Goolge Nexus 4', width: 384, height: 640, ratio: 2 },
        nexu5: { name: 'Goolge Nexus 5', width: 360, height: 640, ratio: 3 },
        nexu6: { name: 'Goolge Nexus 6', width: 412, height: 732, ratio: 3.5 },
        nexu7: { name: 'Goolge Nexus 7', width: 960, height: 600, ratio: 2 },
    };
    let scene = null;
    let rotated = false;
    // socket
    // =======================
    let socket = io();

    // 开启 socket 监听的消息交互
    function socketMonitor() {
        socket.on('browser:reload', function() {
            window.location.reload();
        });

        socket.on('browser:disconnect', function() {
            window.location.reload();
        });

        /**
         * 全局错误捕获
         * @param {String}  msg    错误信息
         * @param {String}  url    出错文件
         * @param {Number}  row    行号
         * @param {Number}  col    列号
         * @param {Object}  error  错误详细信息
         */
        window.onerror = function(...args) {
            console.error(...args);
            args[0] = 'Preview error:' + args[0];
            socket.emit('preview error', ...args);
            return true; // 注意，在返回 true 的时候，异常才不会继续向上抛出error;
        };
    }

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
        if (!select.value || select.value === 'default') {
            // 当前模式为自定义
            let {designWidth, designHeight} = window._CCSettings;
            width = designWidth || 960;
            height = designHeight || 480;
        } else {
             width = DEVICES[select.value].width;
             height = DEVICES[select.value].height;
        }

        return rotated ? { height: width, width: height } : { width, height };
    }

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
    function initHandles() {
        rotateBtn.addEventListener('click', function() {
            rotated = !rotated;
            toggleElementClass(rotateBtn, 'checked');
            updateResolution();
            socket.emit('changeOption', 'rotate', rotated);
        });

        select.addEventListener('change', function(event) {
            updateResolution();
            socket.emit('changeOption', 'device', event.target.value);
        });

        // init show fps, true by default
        showFPSBtn.addEventListener('click', function() {
            let show = !cc.debug.isDisplayStats();
            cc.debug.setDisplayStats(show);
            toggleElementClass(showFPSBtn, 'checked');
            socket.emit('changeOption', 'showFps', show);
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
            socket.emit('changeOption', 'debugMode', value);
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
            var percent = 100 * completedCount / totalCount * 0.6; // 划分加载进度，场景加载 60%
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
            showFPS: showFPSBtn.className === 'checked',
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
        const fps = inputSetFPS.value || 60;
        cc.game.setFrameRate(fps);
        updateResolution();
    }

    // 入口函数
    function onload() {
        // init operation event
        initHandles();
        // load scene file
        initScene();
    }

    function init() {
        // select 标签的初始化
        select.value = select.getAttribute('value');
        optsDebugMode.value = optsDebugMode.getAttribute('value');
        rotated = (rotateBtn.className === 'checked');
        // 监听刷新
        socketMonitor();
        showLoading();
    }

    init();
    // 全局入口
    window.onload = function() {
        if (window.__quick_compile__) {
            window.__quick_compile__.onProgress =  function(completedCount, totalCount) {
                var percent = 100 * completedCount / totalCount * 0.4; // 划分加载进度，引擎加载 40%
                progressBar && (progressBar.style.width = percent.toFixed(2) + '%');
            };
            window.__quick_compile__.load(onload);
        } else {
            onload();
        }
    };
})();
