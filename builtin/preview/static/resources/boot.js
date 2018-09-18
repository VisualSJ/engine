(function() {
    ('use strict');
    // abbreviation for querySelector
    const q = document.querySelector.bind(document);
    // dom element
    const canvas = q('#GameCanvas');
    const select = q('#opts-device');
    const rotateBtn = q('#btn-rotate');
    const pauseBtn = q('#btn-pause');
    const stepBtn = q('#btn-step');
    const showFPSBtn = q('#btn-show-fps');
    const recompileBtn = q('#btn-recompile');

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
    function showLoading() {
        const { width, height } = getEmulatedScreenSize();
        const splash = q('#splash');
        const progressBar = q('#splash .progress-bar span');
        const gameContainer = q('#GameDiv');

        splash.style.width = `${width}px`;
        splash.style.height = `${height}px`;
        splash.style.display = '';
        progressBar.style.width = '0%';
        if (width > height) {
            splash.style.backgroundImage = `url("./splash_portrait.png")`;
        }
        if (gameContainer) {
            gameContainer.style.visibility = 'visible';
        }

        canvas.width = width;
        canvas.height = height;
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
    }

    initPreviewOptions();

    window.onload = function() {
        onload();
    };
    // open scene
    function open(response) {
        q('#splash').style.display = 'none';
        const file = response.target.responseText;
        const $canvas = q('#GameCanvas');

        // 启动引擎
        scene = new cc.App($canvas);
        scene.resize();

        window.app = scene;

        eval(file);

        // 启动场景
        scene.run();
        checkEmptyScene();
    }

    /**
     * send http request for scene file
     * @param {*} src
     * @param {*} callback
     */
    function requestScene(src, callback) {
        const request = new XMLHttpRequest();
        request.addEventListener('progress', updateProgress);
        request.addEventListener('load', callback);
        request.open('get', src, 'true');
        request.send();
    }

    function updateProgress(event) {
        const { loaded = 0, total = 100 } = event;
        const progressBar = q('#splash .progress-bar span');
        const percent = (loaded / total) * 100;
        if (event.lengthComputable && progressBar) {
            progressBar.style.width = `${percent.toFixed(2)}%`;
        }
    }

    function checkEmptyScene() {
        if (scene) {
            const views = scene._scene._views;
            const models = scene._scene._models;
            if (views.length && models._count) {
                return;
            }
        }
        q('#bulletin').style.display = 'block';
        q('#sceneIsEmpty').style.display = 'block';
    }

    function onload() {
        // socket
        // =======================
        var socket = io();
        socket.on('browser:reload', function() {
            window.location.reload();
        });
        socket.on('browser:confirm-reload', function() {
            var r = confirm('Reload?');
            if (r) {
                window.location.reload();
            }
        });

        // init operation event
        rotateBtn.addEventListener('click', function() {
            rotated = !rotated;
            toggleElementClass(rotateBtn, 'checked');
            updateResolution();
        });
        select.addEventListener('change', function() {
            const value = select.value;
            updateResolution();
        });

        function updateResolution() {
            const { width, height } = getEmulatedScreenSize();
            const gameDiv = q('#GameDiv');
            const gameContainer = q('#GameContainer');
            gameDiv.style.width = gameContainer.style.width = `${width}px`;
            gameDiv.style.height = gameContainer.style.height = `${height}px`;

            if (scene && scene.resize) {
                scene.resize();
            }
        }
        // load scene file
        // =======================
        updateResolution();
        requestScene('/current-scene.js', open);
    }
})();
