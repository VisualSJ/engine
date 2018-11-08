const { basename, join, relative, extname } = require('path');
const { readFileSync } = require('fs');
const BrowserResolve = require('browser-resolve'); // 解析成 Node 和浏览器共用的 JavaScript 包
const Mdeps = require('module-deps'); // 用于获取 js 模块依赖
const JSONStream = require('JSONStream');
const Concat = require('concat-stream');
const xtend = require('xtend'); // 用于扩展对象的插件包
const builtins = require('browserify/lib/builtins.js');

// const mdeps = new Mdeps(mpConfig);
const insertGlobals = require('insert-module-globals');
// 配置一个insert-module-globals 转换来检测和执行 process, Buffer, global, __dirname, __filename.

// 定义动态加载 js 时需要添加的脚本头尾部
const SCRIPTS_HEADER = ``;

const SCRIPTS_FOOTER = ``;
let scriptsCache = []; // 脚本缓存
let script2uuid = {}; // 脚本映射表

const DB_PROTOCOL_HEADER = 'db://';
const ASSET_HEADER = 'db://assets/';
const CCSETTINGS_PREFIX = 'window._CCSettings';
const PREVIEW_PATH = 'preview-scripts';
const RAWASSETSPATH = join(Editor.App.project, '/assets');

// import 类型与 资源类名映射表
// TODO: 待完善
const type2CCClass = {
    javascript: 'CC.JavaScript',
    texture: 'cc.Texture2D',
    'sprite-frame': 'cc.SpriteFrame',
    'bitmap-font': 'cc.BitmapFont',
    'label-atlas': 'cc.LabelAtlas',
    'audio-clip': 'cc.AudioClip',
    'animation-clip': 'cc.AnimationClip',
    'tiled-map': 'cc.TiledMapAsset',
    // 'tiled-map': 'sp.SkeletonData',
    // 'tiled-map': 'cc.Prefab',
    // 'label-atlas': 'cc.ParticleAsset',
    markdown: 'cc.TextAsset'
};

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
                isNodeModule: true
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
            deps: path.deps
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

// 获取对应脚本文件的依赖缓存信息
async function getScriptsCache(scripts) {
    return new Promise((resolve) => {
        let concat = Concat((buf) => {
            let str = buf.toString();
            str = `{"scripts": ${str}}`;
            let parsedScripts = [];
            try {
                parsedScripts = JSON.parse(str).scripts;
            } catch (err) {
                Editor.error(err);
            }
            let newScripts = updateNodeModules(parsedScripts);
            resolve(newScripts);
        });
        // 定义查找脚本依赖的配置文件
        let mpConfig = {
            extensions: ['.js', '.json'],

            // 忽略不存在的模块，否则会打断分析过程，得不到回调
            // 不存在的模块会在 page 层加载模块时输出信息。
            ignoreMissing: true
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
                    }
                }
            });
        };

        // module-deps 内部会使用 fs 来读取文件，文件太多的话会造成 too many open files 错误
        // 所以这里使用 fileCache 来提前传入文件内容
        mpConfig.fileCache = {};
        for (let path of scripts) {
            let rawPath = join(Editor.App.project, getRightUrl(path.file));
            mpConfig.fileCache[rawPath] = readFileSync(rawPath, 'utf8');
        }
        let md = new Mdeps(mpConfig);
        md.pipe(JSONStream.stringify()).pipe(concat);
        for (let path of scripts) {
            let rawPath = join(Editor.App.project, getRightUrl(path.file));
            md.write({ file: rawPath });
        }
        md.end();
    });
}

// 获取场景配置信息
function getConfig() {
    // 获取项目配置信息
    let profile = Editor.Profile.load('profile://project/project.json');
    return {
        designWidth: 960,
        designHeight: 640,
        groupList: profile.get('group-list') || ['default'],
        collisionMatrix: profile.get('collision-matrix') || [[true]],
        platform: 'web-desktop',
        rawAssets: {}
    };
}

// 将绝对路径转换为 preview-script 路径下的
function rawPathToAssetPath(path) {
    let mainPoint = path.replace(Editor.App.project, PREVIEW_PATH);
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
    let rawPath = join(Editor.App.project, getRightUrl(path));
    // subAsset 类型的路径需要去掉扩展名
    if (type) {
        rawPath = rawPath.replace(extname(rawPath), '');
    }
    return relative(RAWASSETSPATH, rawPath);
}

// 查询资源的相关信息
async function queryAssets() {
    const assetList = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
    let assets = {};
    let plugins = [];
    let scripts = [];
    let sceneList = [];
    script2uuid = {};
    for (let i = 0, len = assetList.length; i < len; i++) {
        let asset = assetList[i];
        if (asset.isDirectory || asset.importer === 'database') {
            continue;
        }
        if (isScript(asset.importer)) {
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
            sceneList.push({ url: asset.source, uuid: asset.uuid });
            continue;
        }
        if (asset.subAssets && Object.keys(asset.subAssets).length > 0) {
            Object.keys(asset.subAssets).forEach((key) => {
                let item = asset.subAssets[key];
                let uuid = item.uuid;
                assets[uuid] = [];
                assets[uuid].push(getAssetUrl(asset.source, item.importer), type2CCClass[item.importer]);
            });
        }
        assets[asset.uuid] = [];
        assets[asset.uuid].push(getAssetUrl(asset.source), type2CCClass[asset.importer]);
    }
    return { assets, plugins, scripts, sceneList };
}

// 构建打包
function compressPackedAssets() {
    return {};
}

// 获取当前展示场景的数据信息
async function getCurrentScene() {
    const uuid = await Editor.Ipc.requestToPackage('scene', 'query-current-scene');
    const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    return asset.source;
}

// 获取 setting 的脚本信息
async function getSetting(options) {
    const setting = Object.assign(options, getConfig());

    const DEBUG = (setting.debug = options.debug);
    const PREVIEW = options.preview;
    setting.launchScene = await getCurrentScene();
    setting.packedAssets = compressPackedAssets(options.packedAssets) || {};
    setting.md5AssetsMap = {};
    let obj = await queryAssets();
    setting.rawAssets.assets = obj.assets;
    setting.scenes = obj.sceneList;
    setting.scripts = await getScriptsCache(obj.scripts);
    return setting;
}

function getLibraryPath(uuid, extname) {
    return join(Editor.Project.path, 'library', uuid.substr(0, 2), uuid + extname);
}

function getModules(path) {
    let rawPath = join(Editor.App.project, path);
    let uuid = script2uuid[path];
    let libraryPath = getLibraryPath(uuid, extname(rawPath));
    let previewPath = rawPathToAssetPath(rawPath);
    const HEADER = `(function() {"use strict";
    var __module = CC_EDITOR ? module : {
        exports: {}
    };
    var __filename = '${previewPath}';
    var __require = CC_EDITOR ? function(request) {
        return cc.require(request, require);
    }
    : function(request) {
        return cc.require(request, __filename);
    }
    ;
    function __define(exports, require, module) {`;
    const FOOTER = `}if (CC_EDITOR) {
        __define(__module.exports, __require, __module);
    }else {
        cc.registerModuleFunc(__filename, function () {
            __define(__module.exports, __require, __module);
        });
    }})();`;
    const str = readFileSync(libraryPath, 'utf-8');
    return HEADER + str + FOOTER;
}
module.exports = {
    getSetting,
    getModules
};
