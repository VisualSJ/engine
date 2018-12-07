const { basename, join, relative, extname } = require('path');
const { readFileSync } = require('fs');
const { copyFileSync, ensureDir, outputFileSync, readJSONSync} = require('fs-extra');
const BrowserResolve = require('browser-resolve'); // 解析成 Node 和浏览器共用的 JavaScript 包
const Mdeps = require('module-deps'); // 用于获取 js 模块依赖
const JSONStream = require('JSONStream');
const Concat = require('concat-stream');
const xtend = require('xtend'); // 用于扩展对象的插件包
const builtins = require('browserify/lib/builtins.js');
const lodash = require('lodash'); // 排序

// const mdeps = new Mdeps(mpConfig);

// 配置一个insert-module-globals 转换来检测和执行 process, Buffer, global, __dirname, __filename.
const insertGlobals = require('insert-module-globals');

let script2uuid = {}; // 脚本映射表

const DB_PROTOCOL_HEADER = 'db://';
const PREVIEW_PATH = 'preview-scripts';

const commonInfo = {};

// 初始化数据
function initInfo(info) {
    Object.assign(commonInfo, info);
    commonInfo.RAWASSET_SPATH = join(commonInfo.project, '/assets');
    commonInfo.INTERNAL_PATH = join(commonInfo.app, 'builtin/asset-db/static/internal/assets');
}
// 判断是否是脚本
function isScript(assetType) {
    return assetType === 'javascript' || assetType === 'coffeescript' || assetType === 'typescript';
}

// 判断是否为 node 依赖模块
function isNodeModulePath(path) {
    return path.replace(/\\/g, '/').indexOf('/node_modules/') !== -1;
}

// 更新处理模块依赖数据（转换路径，转换依赖路径为 index）
function updateNodeModules(scripts) {
    let tempScripts = [];
    scriptsCache = [];
    for (let path of scripts) {
        if (isNodeModulePath(path.file)) {
            let file = rawPathToAssetPath(path.file);
            tempScripts.push({
                file,
                deps: path.deps,
                isNodeModule: true,
            });
            continue;
        }
        for (let key of Object.keys(path.deps)) {
            let index = findDepIndex(scripts, path.deps[key]);
            if (index === -1) {
                console.error(`${path.deps[key]} is not exit, please check it again`);
                continue;
            }
            path.deps[key] = index;
        }
        let file = rawPathToAssetPath(path.file);
        tempScripts.push({
            file,
            deps: path.deps,
        });
    }
    scriptsCache = tempScripts;
    return tempScripts;
}

// 获取依赖指定脚本在脚本数组中的 index
function findDepIndex(scripts, dep) {
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].file === dep) {
            return i;
        }
    }
}

/**
 * 获取对应脚本文件的依赖缓存信息
 * @param {Array} scripts 脚本信息数组
 * @returns
 */
async function getScriptsCache(scripts) {
    return new Promise((resolve) => {
        let concat = Concat((buf) => {
            let str = buf.toString();
            str = `{"scripts": ${str}}`;
            let parsedScripts = [];
            try {
                parsedScripts = JSON.parse(str).scripts;
            } catch (err) {
                console.error(err);
            }
            let newScripts = updateNodeModules(parsedScripts);
            resolve(newScripts);
        });
        // 定义查找脚本依赖的配置文件
        let mpConfig = {
            extensions: ['.js', '.json'],

            // 忽略不存在的模块，否则会打断分析过程，得不到回调
            // 不存在的模块会在 page 层加载模块时输出信息。
            ignoreMissing: true,
        };

        // 自定义解析函数
        mpConfig.resolve = (id, parent, cb) => {
            let name = basename(id);

            if (name.endsWith('.js')) {
                name = name.slice(0, -3);
            } else if (name.endsWith('.json')) {
                name = name.slice(0, -5);
            }

            // let path = scripts[name.toLowerCase()];
            // if (!isNodeModulePath(parent.filename) && path) {
            //     return cb(null, path);
            // }

            parent.paths = require.main.paths.concat(parent.paths);

            BrowserResolve(id, parent, cb);
        };
        mpConfig.modules = xtend(builtins);

        // 配置全局转换规则
        mpConfig.globalTransform = function(file) {
            return insertGlobals(file, {
                vars: {
                    process: function() {
                        return "require('_process')";
                    },
                },
            });
        };

        // module-deps 内部会使用 fs 来读取文件，文件太多的话会造成 too many open files 错误
        // 所以这里使用 fileCache 来提前传入文件内容
        mpConfig.fileCache = {};
        for (let path of scripts) {
            let rawPath = join(commonInfo.project, getRightUrl(path.file));
            mpConfig.fileCache[rawPath] = readFileSync(rawPath, 'utf8');
        }
        let md = new Mdeps(mpConfig);
        md.pipe(JSONStream.stringify()).pipe(concat);
        for (let path of scripts) {
            let rawPath = join(commonInfo.project, getRightUrl(path.file));
            md.write({ file: rawPath });
        }
        md.end();
    });
}

/**
 * 获取初始配置信息
 * @param {*} type 当前构建种类
 * @param {*} config 相关配置
 * @returns
 */
async function getCustomConfig(type, config) {
    let info ;
    switch (type) {
        case 'simulator':
            info = {
                designWidth: config.simulator_width || 960,
                designHeight: config.simulator_height || 480,
            };
            break;
        case 'build-release':
            info = {
                designWidth: await getProSetting('preview.design_width') || 960,
                designHeight: await getProSetting('preview.design_height') || 480,
            };
            break;
        default:
            info = {
                designWidth: 960,
                designHeight: 480,
            };
            break;
    }
    info.groupList = await getProSetting('preview.group_list') || ['default'];
    info.collisionMatrix =  await getProSetting('preview.collision_matrix') || ['default'];
    info.rawAssets = {};
    return info;
}

// 将绝对路径转换为 preview-script 路径下的
function rawPathToAssetPath(path) {
    let mainPoint = path.replace(commonInfo.project, PREVIEW_PATH);
    return mainPoint.replace(/\\/g, '/');
}

// 去除 db:// 的路径
function getRightUrl(path) {
    if (!path.startsWith(DB_PROTOCOL_HEADER)) {
        console.error('unknown path to build: ' + path);
        return path;
    }
    // 获取剔除 db:// 后的文件目录
    let mountPoint = path.slice(DB_PROTOCOL_HEADER.length);
    if (!mountPoint) {
        console.error('unknown mount to build: ' + path);
        return null;
    }
    return mountPoint;
}

/**
 * 处理资源类的路径
 * @param {*} path db:// 类型路径
 * @param {*} type 标识是否为 subAsset ，有传值既为 subAsset
 * @returns
 */
function getAssetUrl(path, type) {
    // let rawPath = join(commonInfo.project, getRightUrl(path));
    let rawPath = '';
    var mountPoint = getRightUrl(path);
    var inAssets = inInternal = false;
    if (mountPoint.startsWith('assets')) {
        inAssets = true;
        rawPath = join(commonInfo.project, mountPoint);
    } else if (mountPoint.startsWith('internal')) {
        inInternal = true;
        rawPath = join(commonInfo.INTERNAL_PATH, mountPoint.replace(/\binternal/, ''));
    }
    // subAsset 类型的路径需要去掉扩展名
    if (type) {
        rawPath = rawPath.replace(extname(rawPath), '');
    }
    if (inAssets) {
        rawPath = relative(commonInfo.RAWASSET_SPATH, rawPath).replace('resources\\', '');
    } else if (inInternal) {
        rawPath = relative(commonInfo.INTERNAL_PATH, rawPath).replace('resources\\', '');
    }
    return rawPath.replace(/\\/g, '\/');
}

// 查询资源的相关信息
async function queryAssets(scenes) {
    let assetList = await requestToPackage('asset-db', 'query-assets');

    // 根据 source 排序，否则贴图资源会无法正确贴图
    assetList = lodash.sortBy(assetList, (asset) => {
        return asset.source;
    });
    let dependUuid = [];
    let sceneList = [];
    if (scenes) {
        // 获取当前构建选择场景的依赖资源
        for (let scene of scenes) {
            let library = await requestToPackage('asset-db', 'query-asset-library', scene.uuid);
            const json = readJSONSync(library['.json']);
            let detail = new cc.deserialize.Details();
            cc.deserialize(json, detail, {
                ignoreEditorOnly: true,
            });
            dependUuid.push(...detail.uuidList);
        }
        sceneList = scenes;
    }

    let assets = {};
    let internal = {};
    let plugins = [];
    let scripts = [];
    script2uuid = {};
    for (let i = 0, len = assetList.length; i < len; i++) {
        let asset = assetList[i];
        if (asset.isDirectory || asset.importer === 'database') {
            continue;
        }
        if (isScript(asset.importer)) {
            // 如果是构建编译，遇到脚本则直接跳过，构建有另外处理脚本的机制，无需再去分析内部依赖文件
            if (scenes) {
                scripts.push(asset);
                continue;
            }
            if (asset.isPlugin) {
                if (isNative && asset.loadPluginInNative) {
                    plugins.push(asset.uuid);
                } else if (asset.loadPluginInWeb) {
                    plugins.push(asset.uuid);
                }
            }
            let url = asset.source.replace(DB_PROTOCOL_HEADER, '');
            script2uuid[url] = asset.uuid;
            scripts.push({ deps: assets.deps, file: asset.source });
            continue;
        }
        if (asset.importer === 'scene') {
            if (scenes) {
                continue;
            }
            sceneList.push({ url: asset.source, uuid: asset.uuid });
            continue;
        }
        // 并非构建场景依赖的资源并且路径不在 resource 下，不做打包
        if (scenes && dependUuid.indexOf(asset.uuid) === -1 && !asset.source.startsWith('db://assets/resources')) {
            continue;
        }
        // ********************* 资源类型 ********************** //
        // cc.SpriteFrame 类型资源处理
        if (asset.subAssets && Object.keys(asset.subAssets).length > 0) {
            Object.keys(asset.subAssets).forEach((key) => {
                let item = asset.subAssets[key];
                let uuid = item.uuid;
                if (asset.source.startsWith('db://assets')) {
                    assets[uuid] = [];
                    assets[uuid].push(getAssetUrl(asset.source, item.importer), item.type, 1);
                } else if (asset.source.startsWith('db://internal')) {
                    internal[uuid] = [];
                    internal[uuid].push(getAssetUrl(asset.source, item.importer), item.type, 1);
                }
            });
        }
        if (asset.source.startsWith('db://assets')) {
            assets[asset.uuid] = [];
            assets[asset.uuid].push(getAssetUrl(asset.source), asset.type);
        } else if (asset.source.startsWith('db://internal')) {
            internal[asset.uuid] = [];
            internal[asset.uuid].push(getAssetUrl(asset.source), asset.type);
        }
    }

    return { assets, internal, plugins, scripts, sceneList };
}

// 获取当前展示场景的数据信息
async function getCurrentScene(uuid) {
    let currenUuid = await requestToPackage('scene', 'query-current-scene');
    if (!uuid) {
        uuid = await getProSetting('preview.start_scene');
        if ((uuid && uuid === 'current_scene') || typeof(uuid) === 'object' || !uuid) {
            uuid = currenUuid;
        }
    }
    const asset = await requestToPackage('asset-db', 'query-asset-info', uuid);
    if (uuid === currenUuid) {
        asset.currenSceneFlag = true;
    }
    return asset;
}

/**
 * 查询项目配置信息
 * @param {*} key
 */
async function getProSetting(key) {
    let value = await requestToPackage('project-setting', 'get-setting', key);
    return value;
}

/**
 * 查询全局配置信息
 * @param {*} key
 * @returns
 */
async function getGroSetting(key) {
    return await requestToPackage('preferences', 'get-setting', key);
}

function getLibraryPath(uuid, extname) {
    return join(commonInfo.project, 'library', uuid.substr(0, 2), uuid + extname);
}

function getModules(path) {
    let rawPath = join(commonInfo.project, path);
    let uuid = script2uuid[path];
    let previewPath = rawPathToAssetPath(rawPath);
    let libraryPath = getLibraryPath(uuid, extname(rawPath));
    const HEADER = `(function() {
    "use strict";
    var __module = CC_EDITOR ? module : {exports:{}};
    var __filename = '${previewPath}';
    var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} :
    function (request) {return cc.require(request, __filename);};
    function __define (exports, require, module) {
    "use strict";`;
    const FOOTER = `    }if (CC_EDITOR) {
        __define(__module.exports, __require, __module);
}else {
    cc.registerModuleFunc(__filename, function () {
        __define(__module.exports, __require, __module);
    });
}})();`;
    const content = readFileSync(libraryPath, 'utf-8');
    let reg = /cc._RF.push\s*\(\s*module,\s*([\'\"][^\'\"]+\s*[\'\"])\s*,\s*([\'\"][^\'\"]*[\'\"])\s*\)/;
    let rightContent = content.replace(reg, 'cc._RF.push(module, $1, $2, __filename)');
    return HEADER + rightContent + FOOTER;
}

/**
 * 根据 uuid 获取打包后的路径信息
 * @param {*} uuid
 */
function getDestPathNoExt(dest, uuid) {
    return join(dest, 'import', uuid.slice(0, 2), uuid);
}

function requestToPackage(...args) {
    return new Promise((resolve, reject) => {
        Worker.Ipc.send('build-worker:request-package', ...args).callback((err, data) => {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}

/**
 * 通知当前构建进度消息
 * @param {*} msg 消息内容
 * @param {*} rate 当前进度
 */
function updateProgress(msg, rate) {
    Worker.Ipc.send('build-worker:update-progress', msg, rate);
    console.log(`build:${msg} ${rate}`);
}

// 查询当前项目配置的子包信息
function querySubPackages() {
    // todo 查询子包
    return [];
}

// 将脚本根据子包设置，分类
function sortScripts(scripts) {
    let subScrips = [];
    let subPackages = querySubPackages();
    // todo 根据子包做脚本过滤拆分
    // if (subPackages.length > 0) {
    //     return {
    //         mainScrips: scripts,
    //     };
    // }
    // hack
    let mainScrips = [];
    let rawPathToLibPath = {};
    scripts.forEach((script) => {
        let rawPath = join(commonInfo.project, getRightUrl(script.source));
        let libraryPath = script.library['.js'];
        rawPathToLibPath[rawPath] = libraryPath;
        mainScrips.push(rawPath);
    });
    allScripts = mainScrips;
    return {
        mainScrips,
        subScrips,
        allScripts,
        rawPathToLibPath,
    };
}

module.exports = {
    getModules,
    getCurrentScene,
    getProSetting,
    getGroSetting,
    getCustomConfig,
    queryAssets,
    getScriptsCache,
    initInfo,
    requestToPackage,
    getDestPathNoExt,
    sortScripts,
    updateProgress,
};
