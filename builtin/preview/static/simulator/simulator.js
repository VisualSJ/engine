const TreeKill = require('tree-kill');
const {getGroSetting , getEnginInfo, getCurrentScene, buildSetting, writScripts} = require('./../utils/util');
const {ensureDirSync, copySync, emptyDirSync, writeFileSync} = require('fs-extra');
const {readFileSync} = require('fs');
const spawn = require('child_process').spawn;
const {join} = require('path');
const IconvLite = require('iconv-lite');

let previewProcess; // 标识模拟器预览进程是否存在
const INTERNAL_NAME = 'temp/internal';
const WINDOW_HEADER = 'window._CCSettings =';
const SCIPT_TEMP_PATH = join(Editor.App.project, 'temp/quick-scripts');
const LIBREAY_PATH = join(Editor.App.project, 'library');

let simulator;
let simulatorRoot;
let simulatorPath;
let simulatorTemp = join(__dirname, './../../simulator');

let cocosRoot = join(Editor.App.path, 'cocos2d-x');
let envStr = null;
// 初始化获取环境变量配置参数
function initCocosEnv() {
    if (!envStr) {
        let env = {
            COCOS_FRAMEWORKS: join(cocosRoot, '../'),
            COCOS_X_ROOT: cocosRoot,
            COCOS_CONSOLE_ROOT: join(cocosRoot, 'tools/cocos2d-console/bin'),
            NDK_ROOT: '',
            ANDROID_SDK_ROOT: ''
        };
        envStr = '';
        Object.keys(env).forEach((key) => {
            if (envStr !== '') {
                envStr += ';';
            }
            envStr += `${key}=${env[key]}`;
        });
    }
    return envStr;
}

function checkCocosSetting(type, path) {
    if (!path) {
        return new Error(`[${type}] is empty, please set [${type}] in Preferences.`);
    }

    if (!Fs.existsSync(path)) {
        return new Error(`Can\'t find [${type}] path: ${path}`);
    }

    return null;
}

// 停止运行
function stop() {
    if (previewProcess) {
        TreeKill(previewProcess.pid);
        previewProcess = null;
    }
}

function setSimulatorTemp() {
    let path = getGroSetting('preview.simulator_path');
    if (path && typeof(path) !== Object) {
        simulatorTemp = path;
    }
}

/**
 * 获取模拟器的配置信息
 */
async function getSimulatorConfig() {
    let config = await Editor.Ipc.requestToPackage('project-setting', 'get-setting', 'preview');
    if (config && config.simulatorSettingType === 'global') {
        config = await Editor.Ipc.requestToPackage('preferences', 'get-setting', 'preview');
    }
    return config;
}

// 开始运行
async function run() {
    stop();
    // TODO:针对 打开 debug 模式的处理
    let debug = await getGroSetting('preview.simulator_debugger');
    if (debug) {
        console.log('simulator debugger open');
    }
    let encoding = 'utf-8';
    if (process.platform === 'darwin') {
        simulatorPath = join(simulatorTemp, '/mac/Simulator.app');
        simulator = join(simulatorPath, 'Contents/MacOS/Simulator');
        simulatorRoot = join(simulatorPath, 'Contents/Resources');
    } else if (process.platform === 'win32') {
        simulatorPath = join(simulatorTemp, '/win32');
        simulator = join(simulatorPath, 'Simulator.exe');
        simulatorRoot = simulatorPath;
    }
    let enginInfo = await getEnginInfo();
    let enginePath = join(enginInfo.path, '/bin');

    let destInternal = join(Editor.Project.path, INTERNAL_NAME);
    // 先删除原文件
    emptyDirSync(destInternal);

    let copyFiles = [
        {src: join(__dirname, './../resources/modular.js'), dist: join(simulatorRoot, 'src/modular.js')},
        {src: join(enginePath, 'cocos2d-jsb-for-preview.js'), dist: join(simulatorRoot, 'src/cocos2d-jsb.js')},
        // 将预制资源文件拷入内置资源库
        {src: join(simulatorTemp, '/default-assets'), dist: destInternal},
    ];
    let distSrc = join(simulatorRoot, 'src');
    ensureDirSync(distSrc);
    for (let file of copyFiles) {
        try {
            copySync(file.src, file.dist);
        } catch (error) {
            console.error(error);
        }
    }

    // Promise.all([writeMain(), writeCurrentScene(), writeSetting()]);
    // 写入 setting 文件
    await writeSetting();
    // 写入 main 文件
    await writeMain();
    // 写入当前预览场景信息
    await writeCurrentScene();

    initCocosEnv();
    let args = ['-workdir', simulatorRoot, '-writable-path', simulatorRoot, '-console', 'false', '--env', envStr];

    try {
        previewProcess = spawn(simulator, args);
    } catch (error) {
        console.error(error);
        return;
    }

    previewProcess.stderr.on('data', (data) => {
        let info;
        if (process.platform === 'win32') {
            info = IconvLite.decode(data, encoding);
        } else {
            info = data.toString();
        }

        if (info.length > 1) {
            info = info.replace(/\n*$/g, '');
        }

        //检查下，如果里面带了warning的信息，那么我们认为他是warning不是error
        let type = 'error';
        if (info.toLowerCase().indexOf('warning') !== -1) {
            type = 'warn';
        }
        console[type](info);
    });

    previewProcess.stdout.on('data', (data) => {
        let info;
        if (process.platform === 'win32') {
            info = IconvLite.decode(data, encoding);
        } else {
            info = data.toString();
        }

        if (info.length > 1) {
            info = info.replace(/\n*$/g, '');
        }

        let infos = info.split('\n');
        infos.forEach((info) => {
            console.log(info);
        });
    });
    previewProcess.on('close', (code, signal) => {
        stop();
    });
    previewProcess.on('error', function(err) {
        simulatorError(err);
    });
}

async function writeMain() {
    let content = readFileSync(join(simulatorTemp, 'main.js'), 'utf-8');
    let rawAssetsBase = Editor.Project.path;
    let libraryPath = join(rawAssetsBase, 'library');
    let tempScriptsPath = await writScripts();

    if (process.platform === 'win32' && typeof(tempScriptsPath) === 'string') {
        libraryPath = libraryPath.replace(/\\/g, '/');
        rawAssetsBase = rawAssetsBase.replace(/\\/g, '/');
        tempScriptsPath = tempScriptsPath.replace(/\\/g, '/');
    }

    content = content.replace(/{libraryPath}/g, `\'${libraryPath}/\'`);
    content = content.replace(/{rawAssetsBase}/g, `\'${rawAssetsBase}/\'`);
    content = content.replace(/{tempScriptsPath}/g, `\'${tempScriptsPath}/\'`);
    content = 'debugger\n' + content;
    writeFileSync(join(simulatorRoot, 'main.js'), content);
    return;
}

async function writeCurrentScene() {
    let dest = join(simulatorRoot, 'preview-scene.json');
    let asset = await getCurrentScene();
    copySync(asset.files[0], dest);
    return;
}

async function writeSetting() {
    let config = await getSimulatorConfig();
    let setting = await buildSetting({
        debug: true,
        preview: true,
        platform: 'web-desktop'
    }, config);
    let content = JSON.stringify(setting);
    content = content.replace(/"?internal"?:/, `"${join(Editor.Project.path, INTERNAL_NAME)}":`);
    writeFileSync(join(simulatorRoot, 'src/settings.js'), WINDOW_HEADER + content);
    return;
}

function simulatorError(err, code) {
    if (err) {
        console.error(err);
        return;
    }
    previewProcess = null;
}
module.exports = {
    run,
    stop
};
