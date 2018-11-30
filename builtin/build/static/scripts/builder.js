const EventEmitter = require('events').EventEmitter;
const { getCustomConfig, queryAssets, getScriptsCache , getCurrentScene} = require('./utils');
const {join, basename} = require('path');
const { readJSONSync, emptyDirSync, outputFileSync, copySync, ensureDirSync} = require('fs-extra');
const {readFileSync, existsSync} = require('fs');
const _ = require('lodash');
const buildResult = require('./build-result');
const platfomSettigns = require('./platforms-config');
const WINDOW_HEADER = 'window._CCSettings =';
class Builder extends EventEmitter {
    constructor() {
        super();
        this._paths = null;
        this._options = null;
    }

    // 初始化整理 options 数据
    async init(options) {
        const tempConfig = await getCustomConfig('build-release');
        const isWeChatSubdomain = options.platform === 'wechatgame-subcontext';
        const isWeChatGame = (options.platform === 'wechatgame' || isWeChatSubdomain);
        const isQQPlay = options.platform === 'qqplay';
        const platformInfo = platfomSettigns[options.platform];
        const nativeRenderer = !!options.nativeRenderer;
        Object.assign(options, tempConfig, {
            isWeChatGame,
            isQQPlay,
            nativeRenderer,
            isNativePlatform: platformInfo.isNative,
        });
        this._options = options;
        this._paths = await this.buildPaths(options.dest, options.debug);
    }

    // 项目构建
    async build(options) {
        await this.init(options);
        // 先清空文件夹
        emptyDirSync(this._paths.dest);
        // 开始正式构建部分

        // 构建切割引擎
        // await this.buildEngin();

        // 构建拷贝模板 index 文件
        await this.buildHtml();
        buildMain();

        // 构建 settings 脚本,写入脚本
        const settings = this.buildSetting({
            debug: options.debug,
            platform: options.platform,
            type: 'build-release', // 构建 setting 的种类
        });
        buildResult.settings = settings;
        outputFileSync(this._paths.settings, settings);
        this.emit('changeState', 5, 'complete', 'build seting.js');

        // 整理资源拷贝资源
    }

    // 构建基础 index.html 模板部分的代码
    async buildHtml() {
        let options = this._options;
        const webDebuggerString = `<script src="${basename(this._paths.webDebuggerSrc)}"></script>`;
        const data = {
            project: options.name || basename(options.project),
            previewWidth: options.designWidth,
            previewHeight: options.designHeight,
            orientation: 'auto',
            webDebugger: options.embedWebDebugger ? webDebuggerString : '',
        };
        const compiled = _.template(readFileSync(join(this._paths.tmplBase, options.platform, 'index.html')));
        outputFileSync(join(this._paths.dest, 'index.html'), compiled(data));
    }

    // 构建基础 main.js 模板部分的代码
    buildMain() {
        let options = this._options;
        const data = {
            renderMode: options.renderMode,
            isWeChatGame: options.isWeChatGame,
            isWeChatSubdomain: options.isWeChatSubdomain,
            isQQPlay: options.isQQPlay,

            // 用于玩一玩的适配用户代码与引擎代码
            engineCode: '',
            projectCode: '',

        };
        const compiled = _.template(readFileSync(join(this._paths.tmplBase, 'common', 'main.js')));
        outputFileSync(join(this._paths.dest, 'main.js'), compiled(data));
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
        setting.title = `Cocos ${Editor.Project.type} | ${basename(currenScene.source)}`;

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
        let obj = await queryAssets();
        setting.rawAssets.assets = obj.assets;
        setting.rawAssets.internal = obj.internal;
        if (options.type !== 'build-release') {
            setting.scenes = obj.sceneList;
        }
        setting.scripts = await getScriptsCache(obj.scripts);
        delete setting.type;
        return WINDOW_HEADER + JSON.stringify(setting);
    }

    // 构建引擎模块
    async buildEngin() {
        let {isNativePlatform, sourceMaps, excludedModules, enginVersion, nativeRenderer} = this._options;
        let {dest, src, jsCacheExcludes, enginPath, jsCache} = this._paths;
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
        let modules = readJSONSync(join(enginPath, 'modules.json'));
        if (!modules || modules.length < 0) {
            console.error(`${join(enginPath, 'modules.json')} does not exist`);
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
                                excludes.push(Path.join(enginPath, file));
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
            let {enginPath} = this._paths;
            let {debug, isNativePlatform, isWeChatSubdomain, sourceMaps, nativeRenderer, isWeChatGame} = this._options;
            const buildUtil = require(join(enginPath, 'gulp/tasks/engine'));
            let func;
            if (debug) {
                func = isNativePlatform ? 'buildJsb' : 'buildCocosJs';
            } else {
                func = isNativePlatform ? 'buildJsbMin' : 'buildCocosJsMin';
            }

            // 利用引擎内部的 gulp 任务来打包相应的引擎模块
            buildUtil[func](
                join(enginPath, 'index.js'),
                dest,
                excludes,
                {
                    wechatgame: isWeChatGame,
                    qqplay: isQQPlay,
                    runtime: false,
                    nativeRenderer: nativeRenderer,
                    wechatgameSub: isWeChatSubdomain,
                },
                resolve,
                sourceMaps
            );
        });
    }

    // 构建需要的各种路径集合
    async buildPaths(dest, debug) {
        const enginInfo = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
        this._options.enginVersion = enginInfo.version;
        let paths = {
            dest,
            tmplBase: join(__dirname, './../build-templates'),
            projTmplBase: join(dest, './build-templates'),
            jsCacheDir: join(enginInfo.path, 'bin/.cache'),
            enginPath: enginInfo.path,
            enginUtil: enginInfo.utils,
        };
        ensureDirSync(paths.jsCacheDir);
        let jsCacheName;
        if (Editor.Project.type === '3d') {
            jsCacheName = this._options.debug ? 'cocos2d-js' : 'cocos2d-js-min';
        } else {
            jsCacheName = this._options.debug ? 'cocos3d-js.dev' : 'cocos3d-js.min';
        }
        Object.assign(paths, {
            template_common: join(paths.tmplBase, 'common/**/*'),
            bundledScript: join(dest, 'src', debug ? 'project.dev.js' : 'project.js'),
            src: join(dest, 'src'),
            res: join(dest, 'res'),
            settings: join(dest, 'src/settings.js'),
            jsCacheExcludes: join(paths.jsCacheDir, (debug ? '.excludes' : '.excludes-min')), // 生成的一个用于快速判断当前引擎内包含的模块
            jsCache: join(paths.jsCacheDir, this._options.platform, `${jsCacheName}.js`),
            webDebuggerSrc: join(Editor.App.path, 'node_modules/eruda/eruda.min.js'),
        });
        return paths;
    }
}

module.exports = new Builder();
