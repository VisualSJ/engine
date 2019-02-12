const { join, basename , extname, dirname, resolve, relative} = require('path');
const { getCustomConfig, getCurrentScene, updateProgress,
     requestToPackage, computeArgs, getMd5Map, appendHashToFileSuffix} = require('./utils');
const { readJSONSync, emptyDirSync, outputFileSync, copySync, ensureDirSync } = require('fs-extra');
const { readFileSync, existsSync, copyFileSync , writeFileSync} = require('fs');
const ejs = require('ejs');
const minify = require('html-minifier').minify;
const CleanCSS = require('clean-css');
const buildResult = require('./build-result');
const platfomConfig = require('./platforms-config');
const WINDOW_HEADER = 'window._CCSettings';
const assetBuilder = require('./build-asset');
const assetPacker = require('./pack-asset');
const scriptBuilder = require('./build-script');
const { spawn } = require('child_process');
const globby = require('globby'); // 路径匹配获取文件路径
const RevAll = require('gulp-rev-all');
const RevDel = require('gulp-rev-delete-original');
const gulp = require('gulp');
const HASH_LEN = 5;
const static_resource = [
    // 需要拷贝的静态资源整理
    'splash.png',
    'style-desktop.css',
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
        const isWeChatGame = options.platform === 'wechatgame' || isWeChatSubdomain;
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
        this._paths = this._buildPaths(options.dest, options.debug, config);
        static_resource[1] = options.platform + '.css';
        let customConfig = await getCustomConfig(options.type, config);
        Object.assign(options, customConfig);
        // 存在设置分辨率
        if (options.resolution) {
            const {width, height} = options.resolution;
            options.designWidth = width;
            options.designHeight = height;
            delete options.resolution;
        }
        buildResult.options = options;
    }

    // 项目构建
    async build(options, config) {
        let startTime = new Date().getTime();
        await this._init(options, config);
        // 先清空文件夹
        emptyDirSync(this._paths.dest);
        // 开始正式构建部分
        updateProgress('build setting...');

        // 并发任务
        await Promise.all([
            this._buildEngine(), // 构建切割引擎 15%
            this._buildHtml(), // 构建拷贝模板 index.html 文件 5%
            this._buildMain(), // 构建拷贝模板 main.js 文件 5%
            this._resolveStatic(), // 其他静态资源拷贝 5%
            this.buildSetting(
                {
                    // 构建 settings 脚本,写入脚本 20% (其中包括资源和脚本的构建，资源拷贝资源 30%，打包构建脚本 15%)
                    scenes: options.scenes,
                    debug: options.debug,
                    platform: options.platform,
                    type: 'build-release', // 构建 setting 的种类
                },
                {
                    start_scene: options.start_scene,
                }
            ),
        ]);
        await this._compressSetting(buildResult.settings); // 压缩 settings 脚本并保存在相应位置 5%
        await this.resolveOthers();
        let endTime = new Date().getTime();
        updateProgress(`build sucess in ${endTime - startTime} ms`);
        requestToPackage('preview', 'set-build-path', this._paths.dest);
    }

    /**
     * 整理其他文件
     */
    resolveOthers() {
        return new Promise((resolve) => {
            if (!this._options.md5Cache) {
                resolve();
                return;
            }
            const {isWeChatGame, isQQPlay, platform, isNativePlatform} = this._options;
            const src = [
                'src/*.js',
                '*',
            ];
            var base = this._paths.dest;
            var dontRenameFile = ['index.html'];
            if (isNativePlatform) {
                dontRenameFile = dontRenameFile.concat(['main.js', 'cocos-project-template.json', 'project.json']);
            }
            var dontSearchFile = [relative(base, this._paths.bundledScript)];
            if (isWeChatGame) {
                dontRenameFile = dontRenameFile.concat(['game.js', 'game.json', 'project.config.json', 'index.js']);
                dontSearchFile = dontSearchFile.concat(['game.json', 'project.config.json']);
            } else if (isQQPlay) {
                // 玩一玩使用的路径是 GameRes://，这里无法检测到
                // 最终这些文件会被合并到一个 js 中，所以就不用 md5 了
                dontRenameFile = dontRenameFile.concat(['main.js', 'cocos2d-js.js', 'cocos2d-js-min.js',
                                                        'project.dev.js', 'project.js', 'settings.js',
                                                        'gameConfig.json', 'inviteIcon.png']);
            }

            if (platform === 'fb-instant-games') {
                dontRenameFile = dontRenameFile.concat(['fbapp-config.json']);
            }

            if (process.platform === 'win32') {
                dontSearchFile = dontSearchFile.map((x) => x.replace(/\\/g, '/'));
            }

            gulp.src(src, {
                cwd: this._paths.dest,
                base: base,
            })
                .pipe(RevAll.revision({
                    // https://github.com/smysnk/gulp-rev-all#options
                    debug: true,
                    hashLength: HASH_LEN,
                    dontRenameFile: dontRenameFile,
                    // 不查找 project.js 里面引用的路径
                    dontSearchFile: dontSearchFile,
                    annotator: function(contents, path) {
                        return [{ contents, path }];
                    },
                    replacer: function(fragment, replaceRegExp, newReference, referencedFile) {
                        if (extname(fragment.path) === '.map') {
                            if (referencedFile.revPathOriginal + '.map' !== fragment.path) {
                                // 只更新 map 文件自身对应的 js 文件的路径
                                return;
                            }
                        }
                        fragment.contents = fragment.contents.replace(replaceRegExp, '$1' + newReference + '$3$4');
                    },
                }))
                .pipe(RevDel())
                .pipe(gulp.dest(this._paths.dest))
                .on('end', resolve);
        });
    }

    /**
     * 给资源添加 hash 值
     */
    async buildMd5Map(setting) {
        if (!this._options.md5Cache) {
            return;
        }
        console.time('revision');
        let md5AssetsMap = await getMd5Map(join(this._paths.res, 'import', '**'));
        const md5NativeAssetsPath = [join(this._paths.res, 'raw-assets', '**')];
        let md5NativeAssetsMap = await getMd5Map(md5NativeAssetsPath);
        // todo 关于设置为子包后 md5 处理
        // for (let subId in buildResults._subpackages) {
        //     let sub = buildResults._subpackages[subId];
        //     let subPath = join(paths.subpackages, sub.name, 'raw-assets', '**');
        //     md5NativeAssetsPath.push(subPath);
        // }
        if (setting.jsList && setting.jsList.length > 0) {
            var base = this._paths.src;
            var jsPaths = setting.jsList.map((x) => resolve(base, x));
            var jsList = jsPaths.map((jsPath) => {
                jsPath = appendHashToFileSuffix(jsPath).path;
                const url = relative(base, jsPath);
                return url.replace(/\\/g, '/');
            });
            jsList.sort();
            setting.jsList = jsList;
        }
        console.timeEnd('revision');
        return {
            import: md5AssetsMap,
            'raw-assets': md5NativeAssetsMap,
        };
    }

    // 拷贝静态资源文件 5%
    _resolveStatic() {
        updateProgress('resolve static resource...');
        Promise.all(
            static_resource.map((file) => {
                let src = join(__dirname, './../build-templates/common', file);
                let dest = join(this._paths.dest, file);
                if (!this._options.debug && extname(file) === '.css') {
                    const cssMinify = new CleanCSS();
                    let data = cssMinify.minify(readFileSync(src, 'utf8'));
                    writeFileSync(dest, data.styles, 'utf8');
                    return;
                }
                copyFileSync(src, dest);
            })
        ).then(() => {
            updateProgress('resolve static resource success', 5);
        });
    }

    // 构建基础 index.html 模板部分的代码 5%
    _buildHtml() {
        updateProgress('build index html...');
        let options = this._options;
        const data = {
            project: options.name || basename(options.project),
            previewWidth: options.designWidth,
            previewHeight: options.designHeight,
            orientation: 'auto',
            engine: `cocos${this._type}`,
            webDebuggerSrc: '',
        };
        if (options.eruda) {
            data.webDebuggerSrc = './eruda.min.js';
            copySync(this._paths.webDebuggerSrc, join(this._paths.dest, data.webDebuggerSrc));
        }
        // 先判断项目内是否有自定义模板
        let destPath = join(this._paths.project, 'build-templates', options.platform, 'index.html');
        if (!existsSync(destPath)) {
            destPath = join(this._paths.tmplBase, options.platform, 'index.html');
        }
        let content = ejs.render(
            readFileSync(destPath, 'utf8'),
            data
        );
        if (!options.debug) {
            content = minify(content, {
                removeComments: true,
                collapseWhitespace: true,
                minifyJS: true,
                minifyCSS: true,
            });
        }
        outputFileSync(join(this._paths.dest, 'index.html'), content);
        updateProgress('build index html success', 5);
    }

    // 构建基础 main.js 模板部分的代码
    _buildMain() {
        updateProgress('build main.js...');
        let options = this._options;
        let contents = readFileSync(join(this._paths.tmplBase, 'common', 'main.js'), 'utf8');
        // qqplay set REMOTE_SERVER_ROOT value
        let isQQPlay = options.platform === 'qqplay';
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
        if (isQQPlay && options.qqplay && options.qqplay.REMOTE_SERVER_ROOT) {
            data.qqplay.REMOTE_SERVER_ROOT = options.qqplay.REMOTE_SERVER_ROOT;
        }
        const content = ejs.render(contents, data);
        outputFileSync(join(this._paths.dest, 'main.js'), content);
        updateProgress('build main.js success', 5);
    }

    // 构建引擎模块
    async _buildEngine() {
        updateProgress('build engine...');
        let { sourceMaps, excludedModules, enginVersion, nativeRenderer } = this._options;
        let { dest, jsCacheExcludes, engine, jsCache } = this._paths;
        let buildDest = join(this._paths.jsCacheDir, this._options.platform, basename(jsCache));
        ensureDirSync(dirname(buildDest));
        let enginSameFlag = false; // 检查缓存中的引擎是否和当前需要编译的引擎一致
        if (existsSync(jsCacheExcludes)) {
            let json = readJSONSync(jsCacheExcludes);
            enginSameFlag =
                enginVersion === json.version &&
                nativeRenderer === json.nativeRenderer &&
                json.excludes.toString() === excludedModules.toString() &&
                json.sourceMaps === sourceMaps;
        }

        // 与缓存内容一致无需再次编译
        if (enginSameFlag && existsSync(jsCache)) {
            copySync(jsCache, join(dest, basename(jsCache)));
            updateProgress('build engine success', 15);
            return;
        }

        // 构建编译引擎
        let modules = readJSONSync(join(engine, 'modules.json'));
        if (!modules || modules.length < 0) {
            console.error(`${join(engine, 'modules.json')} does not exist`);
            // TODO 通知消息报错
            reject(new Error(`${join(engine, 'modules.json')} does not exist`));
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
                        updateProgress('build engine success', 15);
                        return;
                    }
                });
            });
        }
        console.time('buildCocosJs');
        // 执行 gulp 任务，编译 cocos js
        await this._buildCocosJs(excludes, buildDest);
        console.timeEnd('buildCocosJs');
        // 拷贝编译后的 js 文件
        copySync(jsCache, join(dest, basename(jsCache)));

        // 保存模块数据
        writeFileSync(
            jsCacheExcludes,
            JSON.stringify({
                excludes: excludedModules,
                version: enginVersion,
                nativeRenderer,
                sourceMaps,
            }),
            null,
            4
        );
        updateProgress('build engine success', 15);
    }

    /**
     *  执行 gulp 任务，编译 cocos js
     * @param {*} excludes
     * @param {*} outputPath
     * @returns
     * @memberof Builder
     */
    _buildCocosJs(excludes, outputPath) {
        return new Promise((resolve) => {
            let { engine } = this._paths;
            let {
                debug,
                isWeChatSubdomain,
                nativeRenderer,
                isWeChatGame,
                isQQPlay,
            } = this._options;

            // 利用引擎内部的 gulp 任务来打包相应的引擎模块
            let args = computeArgs({
                debug,
                wechatgame: !!isWeChatGame,
                qqplay: !!isQQPlay,
                runtime: false,
                nativeRenderer: nativeRenderer,
                wechatgameSub: !!isWeChatSubdomain,
            });
            const child = spawn('node', [
                join(engine, 'rollup', 'out', 'build-engine-cli.js'),
                '--input',
                './index.js',
                '--destination',
                outputPath,
                '--platform',
                'build',
                ...args,
            ], {
                cwd: engine,
                stdio: [0, 1, 2, 'ipc'],
            });

            child.on('exit', (code) => {
                resolve();
            });
        });
    }

    // 构建缓存需要的各种路径集合
    _buildPaths(dest, debug, config) {
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
            jsCacheExcludes: join(paths.jsCacheDir, debug ? '.excludes' : '.excludes-min'), // 生成的一个用于快速判断当前引擎内包含的模块
            jsCache: join(paths.jsCacheDir, this._options.platform, this._options.cocosJsName),
            webDebuggerSrc: join(config.app, 'node_modules/eruda/eruda.min.js'),
        });
        buildResult.paths = paths;
        return paths;
    }

    // 压缩 settings 脚本并保存
    _compressSetting(settings) {
        updateProgress('compress setting.js...');
        if (this._options.debug) {
            this.saveSetting(settings);
            return settings;
        }
        let uuidIndices = {};
        const that = this;
        function collectUuids() {
            let uuids = (settings.uuids = []);
            let uuidCount = {};

            function addUuid(uuid) {
                uuid = that.compressUuid(uuid);
                var count = (uuidCount[uuid] || 0) + 1;
                uuidCount[uuid] = count;
                if (count >= 2 && !(uuid in uuidIndices)) {
                    uuidIndices[uuid] = uuids.length;
                    uuids.push(uuid);
                }
            }

            let rawAssets = settings.rawAssets;
            Object.values(rawAssets).forEach((value) => {
                for (let uuid of Object.keys(value)) {
                    addUuid(uuid);
                }
            });

            let scenes = settings.scenes;
            for (let scene of scenes) {
                addUuid(scene.uuid);
            }

            let packedAssets = settings.packedAssets;
            for (let value of Object.values(packedAssets)) {
                value.forEach(addUuid);
            }

            let md5AssetsMap = settings.md5AssetsMap;
            for (let md5Entries of Object.values(md5AssetsMap)) {
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
            uuids.forEach((uuid, index) => {
                uuidIndices[uuid] = index;
                // return that.compressUuid(uuid);
            });
        }
        // 先计算收集超过使用超过 1 次的 uuid
        collectUuids();

        // 将有使用到收集到 uuid 的位置替换为 uuids 的索引
        let originRawAssets = settings.rawAssets;
        let newRawAssets = (settings.rawAssets = {});
        let assetTypes = (settings.assetTypes = []);
        for (let assetsType of Object.keys(originRawAssets)) {
            let originEntries = originRawAssets[assetsType];
            let newEntries = (newRawAssets[assetsType] = {});
            for (let uuid of Object.keys(originEntries)) {
                const entry = originEntries[uuid];
                uuid = that.compressUuid(uuid);
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
            scene.uuid = that.compressUuid(scene.uuid);
            let uuidIndex = uuidIndices[scene.uuid];
            if (uuidIndex !== undefined) {
                scene.uuid = uuidIndex;
            }
        }

        let packedAssets = settings.packedAssets;
        for (let key of Object.keys(packedAssets)) {
            let packedIds = packedAssets[key];
            for (let i = 0; i < packedIds.length; ++i) {
                packedIds[i] = that.compressUuid(packedIds[i]);
                let uuidIndex = uuidIndices[packedIds[i]];
                if (uuidIndex !== undefined) {
                    packedIds[i] = uuidIndex;
                }
            }
        }
        let settingsInitFunction;
        if (that._options.md5Cache) {
            let md5AssetsMap = settings.md5AssetsMap;
            for (let key of Object.keys(md5AssetsMap)) {
                const md5Entries = md5AssetsMap[key];
                for (let i = 0; i < md5Entries.length; i += 2) {
                    md5Entries[i] = that.compressUuid(md5Entries[i]);
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
        this.saveSetting(settings, settingsInitFunction);
        return settings;
    }

    /**
     * 压缩 uuid
     * @param {string} uuid
     * @returns
     * @memberof Builder
     */
    compressUuid(uuid) {
        // 非调试模式下， uuid 需要压缩成短 uuid
        if (this._options && !this._options.debug) {
            uuid = Editor.Utils.UuidUtils.compressUuid(uuid, true);
        }
        return uuid;
    }

    /**
     * 保存脚本
     * @param {object} settings
     * @memberof Builder
     */
    saveSetting(settings, settingsInitFunction) {
        buildResult.settings = settings;
        let content = `${WINDOW_HEADER} = ${JSON.stringify(settings, null, this._options.debug ? 4 : 0).replace(
            /"([A-Za-z_$][0-9A-Za-z_$]*)":/gm,
            '$1:'
        )}`;
        if (settingsInitFunction) {
            // 把自解压代码放到 settings.js 中，便于代码压缩，并且避免变更 main.js。
            // 记得这里面的代码只能用 ES5
            content += `(${settingsInitFunction.toString()})(${WINDOW_HEADER});`;
        }
        outputFileSync(this._paths.settings, content);
        updateProgress('compress setting.js success', 5);
    }

    /**
     * 构建 setting 的脚本信息
     * @param {*} options 脚本配置信息(除 type 之外的可以直接放置进 setting 的部分)
     * @param {*} config 其他平台配置 (需要处理后方能加进 setting 的部分)
     * @returns JSON
     */
    async buildSetting(options, config) {
        // let tempConfig = await getCustomConfig(options.type, config);
        let currenScene;
        if (config && config.start_scene) {
            currenScene = await getCurrentScene(config.start_scene);
        } else {
            currenScene = await getCurrentScene();
        }
        // const setting = Object.assign(options, tempConfig);
        const setting = options;
        setting.launchScene = currenScene.source;

        // 预览模式下的 canvas 宽高要以实际场景中的 canvas 为准
        if (options.type !== 'build-release') {
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

        let results = (await scriptBuilder.build(options.type)) || {scripts: [], jsList: []};
        setting.packedAssets = {};
        let assetBuilderResult = await assetBuilder.build(setting.scenes || currenScene, options.type);
        Object.assign(setting, assetBuilderResult, results);
        buildResult.settings = setting;
        updateProgress('build setting...', 20);
        if (options.type === 'build-release') {
            setting.packedAssets = assetPacker.pack();
            setting.md5AssetsMap = (await this.buildMd5Map(setting)) || {};
            return setting;
        }
        delete setting.type;
        return `${WINDOW_HEADER} = ${JSON.stringify(setting)}`;
    }
}

module.exports = new Builder();
