const { getCustomConfig, queryAssets, getScriptsCache ,
     getCurrentScene, updateProgress} = require('./utils');
const {join, basename} = require('path');
const { readJSONSync, emptyDirSync, outputFileSync, copySync, ensureDirSync} = require('fs-extra');
const {readFileSync, existsSync, copyFile} = require('fs');
const ejs = require('ejs');
const buildResult = require('./build-result');
const platfomConfig = require('./platforms-config');
const WINDOW_HEADER = 'window._CCSettings';
const assetBuilder = require('./build-asset');
const scriptBuilder = require('./build-script');
const STATIC_RESOURCE = [
    'splash.png',
    'style-desktop.css',
    'style-mobile.css',
];
class Builder {
    constructor() {
        this._paths = null;
        this._options = null;
        this.state = 0; // 当前构建进度
        this._type = ''; // 当前项目类型
        this.enginVersion = '';
    }

    // 初始化整理 options 数据
    async _init(options, config) {
        const tempConfig = await getCustomConfig('build-release');
        const isWeChatSubdomain = options.platform === 'wechatgame-subcontext';
        const isWeChatGame = (options.platform === 'wechatgame' || isWeChatSubdomain);
        const isQQPlay = options.platform === 'qqplay';
        const platformInfo = platfomConfig[options.platform];
        const nativeRenderer = !!options.nativeRenderer;
        Object.assign(options, tempConfig, {
            isWeChatGame,
            isQQPlay,
            nativeRenderer,
            isNativePlatform: platformInfo.isNative,
        });

        this.isJSB = platformInfo.isNative;
        this.exportSimpleFormat = !platformInfo.stripDefaultValues || platformInfo.exportSimpleProject;
        this.shouldExportScript = !platformInfo.exportSimpleProject;
        this._type = config.type;
        this._options = options;
        this._paths = await this._buildPaths(options.dest, options.debug, config);
        buildResult.options = options;
        updateProgress('start build', 0);
    }

    // 项目构建
    async build(options, config) {
        await this._init(options, config);
        // 先清空文件夹
        emptyDirSync(this._paths.dest);
        // 开始正式构建部分
        updateProgress('build engine...', 0);
        // 构建切割引擎
        await this._buildEngine();
        updateProgress('build engine success', '10%');

        updateProgress('build index html...');
        // 构建拷贝模板 index 文件
        await this._buildHtml();
        updateProgress('build index html success', '15%');

        updateProgress('build index main.js...');
        this._buildMain();
        updateProgress('build index main.js success', '20%');

        updateProgress('resolove static resource...');
        await this._resolveStatic();
        updateProgress('resolove static resource', '25%');

        updateProgress('build setting...');
        // 构建 settings 脚本,写入脚本
        let settings = await this.buildSetting({
            scenes: options.scenes,
            debug: options.debug,
            platform: options.platform,
            type: 'build-release', // 构建 setting 的种类
        });
        updateProgress('build setting success', '40%');

        updateProgress('build assets...');
        // 资源拷贝资源
        assetBuilder.build(settings.rawAssets, settings.scenes);
        updateProgress('build assets success', '70%');

        updateProgress('build scripts...');
        // 打包构建脚本
        scriptBuilder.build(settings.scripts);
        updateProgress('build scripts success', '90%');

        updateProgress('compress setting.js...');
        // 压缩 settings 脚本并保存在相应位置
        settings = this._compressSetting(settings);
        updateProgress('compress setting.js success', '99%');
        updateProgress('build success', '100%');
    }

    // 拷贝静态资源文件
    _resolveStatic() {
        Promise.all(STATIC_RESOURCE.map((file) => {
            return new Promise((resolve, reject) => {
                let src = join(__dirname, './../build-templates/common', file);
                let dest = join(this._paths.dest, file);
                copyFile(src, dest, (error) => {
                    if (error) {
                        console.error(`copy file error: ${error}`);
                        reject(error);
                    }
                    resolve();
                });
            });
        }));
    }

    // 构建基础 index.html 模板部分的代码
    async _buildHtml() {
        let options = this._options;
        const webDebuggerString = `<script src="${basename(this._paths.webDebuggerSrc)}"></script>`;
        const data = {
            project: options.name || basename(options.project),
            previewWidth: options.designWidth,
            previewHeight: options.designHeight,
            orientation: 'auto',
            webDebugger: options.embedWebDebugger ? webDebuggerString : '',
            engine: `cocos${this._type}`,
        };
        const content = ejs.render(readFileSync(join(this._paths.tmplBase, options.platform, 'index.html'), 'utf8'),
         data);
        outputFileSync(join(this._paths.dest, 'index.html'), content);
    }

    // 构建基础 main.js 模板部分的代码
    _buildMain() {
        let options = this._options;
        let contents = readFileSync(join(this._paths.tmplBase, 'common', 'main.js'), 'utf8');
        // qqplay set REMOTE_SERVER_ROOT value
        let isQQPlay = options.platform === 'qqplay';
        if (isQQPlay && options.qqplay && options.qqplay.REMOTE_SERVER_ROOT) {
            let value = 'qqPlayDownloader.REMOTE_SERVER_ROOT = "' + opts.qqplay.REMOTE_SERVER_ROOT + '"';
            contents = contents.replace(/qqPlayDownloader.REMOTE_SERVER_ROOT = ""/g, value);
        }
        const data = {
            includeAnySDK: !!options.includeAnySDK,
            renderMode: !!options.renderMode,
            isWeChatGame: !!options.isWeChatGame,
            isWeChatSubdomain: !!options.isWeChatSubdomain,
            isQQPlay: options.isQQPlay,

            // 用于玩一玩的适配用户代码与引擎代码
            engineCode: '',
            projectCode: '',
            engine: `cocos${this._type}`,

        };
        const content = ejs.render(contents, data);
        outputFileSync(join(this._paths.dest, 'main.js'), content);
    }

    // 构建引擎模块
    async _buildEngine() {
        // hack 当前引擎尚未提供切割引擎的接口,直接拷贝对应文件目录下的文件
        if (this._type === '3d') {
            await copySync(join(this._paths.engine, 'bin/cocos-3d.min.js'),
             join(this._paths.dest, this._options.cocosJsName));
            return;
        }

        let {isNativePlatform, sourceMaps, excludedModules, enginVersion, nativeRenderer} = this._options;
        let {dest, src, jsCacheExcludes, engine, jsCache} = this._paths;
        let buildDest = isNativePlatform ? src : dest;
        let enginSameFlag = false; // 检查缓存中的引擎是否和当前需要编译的引擎一致
        if (existsSync(jsCacheExcludes)) {
            let json = readJSONSync(jsCacheExcludes);
            enginSameFlag = enginVersion === json.version &&
                nativeRenderer === json.nativeRenderer &&
                json.excludes.toString() === excludedModules.toString() &&
                json.sourceMaps === opts.sourceMaps;
        }

        // 与缓存内容一致无需再次编译
        if (enginSameFlag && existsSync(paths.jsCache)) {
            copySync(jsCache, join(dest, basename(jsCache)));
            return;
        }

        // 构建编译引擎
        let modules = readJSONSync(join(engine, 'modules.json'));
        if (!modules || modules.length < 0) {
            console.error(`${join(engine, 'modules.json')} does not exist`);
            // TODO 通知消息报错
            return;
        }
        const excludes = [];
        // 存在模块设置数据，则整理数据
        if (excludedModules && excludedModules.length > 0) {
            excludedModules.forEach(function(exName) {
                modules.some(function(item) {
                    if (item.name === exName) {
                        if (item.entries) {
                            item.entries.forEach(function(file) {
                                excludes.push(join(engine, file));
                            });
                        }
                        return true;
                    }
                });
            });
        }

        // 执行 gulp 任务，编译 cocos js
        await this._buildCocosJs(excludes, buildDest);

        // 拷贝编译后的 js 文件
        copySync(jsCache, join(dest, basename(jsCache)));
        // 保存模块数据
        writeFileSync(paths.jsCacheExcludes, JSON.stringify({
            excludes: excludedModules,
            version: enginVersion,
            nativeRenderer,
            sourceMaps,
        }), null, 4);
    }

    _buildCocosJs(excludes, dest) {
        return new Promise((resolve) => {
            let {engine} = this._paths;
            let {debug, isNativePlatform, isWeChatSubdomain,
                 sourceMaps, nativeRenderer, isWeChatGame, isQQPlay} = this._options;
            const buildUtil = require(join(engine, 'gulp/tasks/engine'));
            let func;
            if (debug) {
                func = isNativePlatform ? 'buildJsb' : 'buildCocosJs';
            } else {
                func = isNativePlatform ? 'buildJsbMin' : 'buildCocosJsMin';
            }

            // 利用引擎内部的 gulp 任务来打包相应的引擎模块
            let indexPath = join(engine, 'index.js');
            buildUtil[func](
                indexPath,
                dest,
                excludes,
                {
                    wechatgame: !!isWeChatGame,
                    qqplay: !!isQQPlay,
                    runtime: false,
                    nativeRenderer: nativeRenderer,
                    wechatgameSub: !!isWeChatSubdomain,
                },
                resolve,
                sourceMaps
            );
        });
    }

    // 构建需要的各种路径集合
    async _buildPaths(dest, debug, config) {
        let paths = {
            dest,
            tmplBase: join(__dirname, './../build-templates'),
            projTmplBase: join(dest, './build-templates'),
            jsCacheDir: join(config.engine, 'bin/.cache'),
            engine: config.engine,
            enginUtil: config.utils,
            project: config.project,
        };
        ensureDirSync(paths.jsCacheDir);
        // hack
        this._options.cocosJsName = `cocos${this._type}-js${debug ? '' : '.min'}.js`;
        Object.assign(paths, {
            template_common: join(paths.tmplBase, 'common/**/*'),
            bundledScript: join(dest, 'src', debug ? 'project.dev.js' : 'project.js'),
            src: join(dest, 'src'),
            res: join(dest, 'res'),
            settings: join(dest, 'src/settings.js'),
            jsCacheExcludes: join(paths.jsCacheDir, (debug ? '.excludes' : '.excludes-min')), // 生成的一个用于快速判断当前引擎内包含的模块
            jsCache: join(paths.jsCacheDir, this._options.platform, this._options.cocosJsName),
            webDebuggerSrc: join(config.app, 'node_modules/eruda/eruda.min.js'),
        });
        buildResult.paths = paths;
        return paths;
    }

    // 压缩 settings
    _compressSetting(settings) {
        if (this._options.debug) {
            return settings;
        }
        let uuidIndices = {};
        const that = this;
        function collectUuids() {
            let uuids = settings.uuids = [];
            let uuidCount = {};

            function addUuid(uuid) {
                var count = (uuidCount[uuid] || 0) + 1;
                uuidCount[uuid] = count;
                if (count >= 2 && !(uuid in uuidIndices)) {
                    uuidIndices[uuid] = uuids.length;
                    uuids.push(uuid);
                }
            }

            let rawAssets = settings.rawAssets;
            Object.keys(rawAssets).forEach((key) => {
                for (let uuid of Object.keys(rawAssets[key])) {
                    addUuid(uuid);
                }
            });

            let scenes = settings.scenes;
            for (let i = 0; i < scenes.length; ++i) {
                addUuid(scenes[i].uuid);
            }

            let packedAssets = settings.packedAssets;
            for (let key of Object.keys(packedAssets)) {
                packedAssets[key].forEach(addUuid);
            }

            let md5AssetsMap = settings.md5AssetsMap;
            for (let key of Object.keys(md5AssetsMap)) {
                let md5Entries = md5AssetsMap[key];
                for (let i = 0; i < md5Entries.length; i += 2) {
                    addUuid(md5Entries[i]);
                }
            }

            if (that._options.preloadDepends) {
                for (let uuid of Object.keys(depends)) {
                    // count reference
                    addUuid(uuid);
                    depends[uuid].forEach(addUuid);
                }
            }

            // sort by reference count
            uuids.sort((a, b) => uuidCount[b] - uuidCount[a]);
            uuids.forEach((uuid, index) => uuidIndices[uuid] = index);
        }
        collectUuids();

        // replace uuid
        let originRawAssets = settings.rawAssets;
        let newRawAssets = settings.rawAssets = {};
        let assetTypes = settings.assetTypes = [];
        for (let assetsType of Object.keys(originRawAssets)) {
            let originEntries = originRawAssets[assetsType];
            let newEntries = newRawAssets[assetsType] = {};
            for (let uuid of Object.keys(originEntries)) {
                const entry = originEntries[uuid];
                let index = uuidIndices[uuid];
                if (index !== undefined) {
                    uuid = index;
                }
                let assetIndex = assetTypes.indexOf(entry[1]);
                if (assetIndex === -1) {
                    assetTypes.push(entry[1]);
                    assetIndex = assetTypes.indexOf(entry[1]);
                }
                entry[1] = assetIndex;
                newEntries[uuid] = entry;
            }
        }

        let scenes = settings.scenes;
        for (let i = 0; i < scenes.length; ++i) {
            let scene = scenes[i];
            let uuidIndex = uuidIndices[scene.uuid];
            if (uuidIndex !== undefined) {
                scene.uuid = uuidIndex;
            }
        }

        let packedAssets = settings.packedAssets;
        for (let key of Object.keys(packedAssets)) {
            let packedIds = packedAssets[key];
            for (let i = 0; i < packedIds.length; ++i) {
                let uuidIndex = uuidIndices[packedIds[i]];
                if (uuidIndex !== undefined) {
                    packedIds[i] = uuidIndex;
                }
            }
        }
        let settingsInitFunction;
        if (that._options.md5Cache) {
            let md5AssetsMap = settings.md5AssetsMap;
            for (let md5Entries of md5AssetsMap) {
                for (let i = 0; i < md5Entries.length; i += 2) {
                    let uuidIndex = uuidIndices[md5Entries[i]];
                    if (uuidIndex !== undefined) {
                        md5Entries[i] = uuidIndex;
                    }
                }
            }
            settingsInitFunction = function(settings) {
                var uuids = settings.uuids;
                var md5AssetsMap = settings.md5AssetsMap;
                for (var md5Entries of md5AssetsMap) {
                    for (var i = 0; i < md5Entries.length; i += 2) {
                        if (typeof md5Entries[i] === 'number') {
                            md5Entries[i] = uuids[md5Entries[i]];
                        }
                    }
                }
            };
        }

        if (that._options.preloadDepends) {
            // set reference index
            for (var asset of Object.keys(depends)) {
                var dep = depends[asset].map((depend) => {
                    var uuidIndex = uuidIndices[depend];
                    if (uuidIndex !== undefined) {
                        return uuidIndex;
                    }
                    return depend;
                });
                var uuidIndex = uuidIndices[asset];
                if (uuidIndex !== undefined) {
                    delete depends[asset];
                    depends[uuidIndex] = dep;
                } else {
                    depends[asset] = dep;
                }
            }
        }
        delete settings.scripts;
        buildResult.settings = settings;
        let content = `${WINDOW_HEADER} = ${JSON.stringify(settings, null, that._options.debug ? 4 : 0)
            .replace(/"([A-Za-z_$][0-9A-Za-z_$]*)":/gm, '$1:')}`;
        if (settingsInitFunction) {
            // 把自解压代码放到 settings.js 中，便于代码压缩，并且避免变更 main.js。
            // 记得这里面的代码只能用 ES5
            content += `(${settingsInitFunction.toString()})(${WINDOW_HEADER});`;
        }
        outputFileSync(that._paths.settings, content);
        return settings;
    }

    /**
     * 获取 setting 的脚本信息
     * @param {*} options 脚本配置信息(除 type 之外的可以直接放置进 setting 的部分)
     * @param {*} config 其他平台配置 (需要处理后方能加进 setting 的部分)
     * @returns JSON
     */
    async buildSetting(options, config) {
        let tempConfig = await getCustomConfig(options.type, config);
        let currenScene;
        if (config && config.start_scene) {
            currenScene = await getCurrentScene(config.start_scene);
        } else {
            currenScene = await getCurrentScene();
        }
        const setting = Object.assign(options, tempConfig);
        setting.launchScene = currenScene.source;

        // 预览模式下的 canvas 宽高要以实际场景中的 cavas 为准
        if (options.type === 'preview') {
            let json = readJSONSync(currenScene.library['.json']);
            let info = json.find((item) => {
                return item.__type__ === 'cc.Canvas';
            });
            // 存在 canvas 节点数据则更新分辨率
            if (info) {
                setting.designWidth = info._designResolution.width;
                setting.designHeight = info._designResolution.height;
            }
        }

        setting.packedAssets = {};
        setting.md5AssetsMap = {};
        let assetObj;
        if (options.type !== 'build-release') {
            assetObj = await queryAssets();
            setting.scenes = assetObj.sceneList;
            setting.scripts = await getScriptsCache(assetObj.scripts);
        } else {
            assetObj = await queryAssets(setting.scenes);
            setting.scripts = assetObj.scripts;
        }
        setting.rawAssets.assets = assetObj.assets;
        setting.rawAssets.internal = assetObj.internal;
        delete setting.type;
        if (options.type !== 'build-release') {
            return setting;
        }
        return `${WINDOW_HEADER} = ${JSON.stringify(setting)}`;
    }
}

module.exports = new Builder();
