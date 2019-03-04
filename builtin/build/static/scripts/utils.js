const { basename, join, relative, extname, dirname, sep } = require('path');
const { readFileSync , renameSync} = require('fs');
const BrowserResolve = require('browser-resolve'); // 解析成 Node 和浏览器共用的 JavaScript 包
const Mdeps = require('module-deps'); // 用于获取 js 模块依赖
const globby = require('globby'); // 路径匹配获取文件路径
const JSONStream = require('JSONStream');
const Concat = require('concat-stream');
const crypto = require('crypto');
const xtend = require('xtend'); // 用于扩展对象的插件包
const builtins = require('browserify/lib/builtins.js');
const buildResult = require('./build-result');
const HASH_LEN = 5;
// const mdeps = new Mdeps(mpConfig);

// 配置一个insert-module-globals 转换来检测和执行 process, Buffer, global, __dirname, __filename.
const insertGlobals = require('insert-module-globals');

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

/**
 * 计算引擎构建参数数组
 */
function computeArgs(options) {
    let arr = [];
    for (let key of Object.keys(options)) {
        let value = options[key];
        if (value) {
            arr.push('--flags', key);
        }
    }
    return arr;
}
// 判断是否为 node 依赖模块
function isNodeModulePath(path) {
    return path.split(sep).join('/').indexOf('/node_modules/') !== -1;
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
    return new Promise((resolve, reject) => {
        let concat = Concat((buf) => {
            let str = buf.toString();
            str = `{"scripts": ${str}}`;
            let parsedScripts = [];
            try {
                parsedScripts = JSON.parse(str).scripts;
            } catch (err) {
                reject(err);
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
        for (let item of scripts) {
            const rawPath = join(commonInfo.project, item.file);
            const libraryPath = getLibraryPath(item.uuid, '.js');
            mpConfig.fileCache[rawPath] = readFileSync(libraryPath, 'utf8');
        }
        let md = new Mdeps(mpConfig);
        md.pipe(JSONStream.stringify()).pipe(concat);
        for (let path of scripts) {
            let rawPath = join(commonInfo.project, path.file);
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
    return mainPoint.split(sep).join('/');
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
 * @param {*} uuid 标识是否为 subAsset ，有传值既为 subAsset
 * @returns
 */
function getAssetUrl(path, uuid) {
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
    if (uuid) {
        uuid = uuid.replace(/@/g, `/`);
        let extName = extname(rawPath);
        rawPath = rawPath.replace(extName, uuid.slice(36));
    }
    if (inAssets) {
        rawPath = relative(commonInfo.RAWASSET_SPATH, rawPath).replace(`resources${sep}`, '');
    } else if (inInternal) {
        rawPath = relative(commonInfo.INTERNAL_PATH, rawPath).replace(`resources${sep}`, '');
    }
    return rawPath.split(sep).join('/');
}

// 获取当前展示场景的数据信息
async function getCurrentScene(uuid) {
    let currenUuid = await requestToPackage('scene', 'query-current-scene');
    if (!currenUuid) {
        const json = await requestToPackage('scene', 'query-scene-json');
        return json;
    }
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
    let uuid = buildResult.script2uuid[path];
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
    return HEADER + rightContent + '\n' + FOOTER;
}

/**
 * 根据 uuid 获取打包后的路径信息
 * @param {*} uuid
 */
function getDestPathNoExt(dest, uuid) {
    return join(dest, 'import', uuid.slice(0, 2), uuid);
}

/**
 * 转发worker 内与其他插件的 ipc 消息
 * @param {*} args 通讯参数
 * @returns
 */
function requestToPackage(...args) {
    return new Promise((resolve) => {
        Worker.Ipc.send('build-worker:request-package', ...args).callback((err, data) => {
            if (err) {
                console.error(`request-package with ${args.toString()}: ${err.message}`);
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
    console.info(`build:${msg} ${rate}`);
}

/**
 * 根据路径计算 hash 值
 * @param {*} path
 */
function appendHashToFileSuffix(path) {
    var filename = basename(path);
    var dir = dirname(path);
    var originalFile = join(dir, filename);
    const data = readFileSync(originalFile);
    var hash = crypto.createHash('md5').update(data).digest('hex');
    hash = hash.slice(0, HASH_LEN);

    var currentDirname = basename(dir);
    var isNativeAsset = Editor.Utils.UuidUtils.isUuid(currentDirname);

    var newFilePath;
    if (isNativeAsset) {
        var dirnameWithHash = dir + '.' + hash;
        newFilePath = join(dirnameWithHash, filename);
        try {
            renameSync(dir, dirnameWithHash);
        } catch (err) {
            console.log(`\x1B[31m[MD5 ASSETS] write file error: ${err.message}\x1B[0m`);
        }
    } else {
        var i = filename.lastIndexOf('.');
        var newFilename = ~i ? `${filename.slice(0, i)}.${hash}${filename.slice(i)}` : `${filename}.${hash}`;
        newFilePath = join(dir, newFilename);
        try {
            renameSync(originalFile, newFilePath);
        } catch (err) {
            console.log(`\x1B[31m[MD5 ASSETS] write file error: ${err.message}\x1B[0m`);
        }
    }
    return { hash, path: newFilePath };
}

/**
 * 根据正则匹配，替换生成带有 hash 后缀的文件路径，返回对应的 map
 * @param {*} pattern
 */
async function getMd5Map(pattern) {
    const getUuidFromLibPath = Editor.Utils.UuidUtils.getUuidFromLibPath;
    const compressUuid = Editor.Utils.UuidUtils.compressUuid;

    // [uuid_1, md5_1, uuid_2, md5_2, ...]
    const md5Entries = [];
    var allResPaths = await globby(pattern, { nodir: true });
    for (var i = 0; i < allResPaths.length; ++i) {
        var filePath = allResPaths[i];
        var originalURL = relative(buildResult.paths.dest, filePath);
        var uuid = getUuidFromLibPath(originalURL);
        if (uuid) {
            md5Entries.push(compressUuid(uuid, true), appendHashToFileSuffix(filePath).hash);
        } else {
            Editor.warn(`Can not resolve uuid for path "${filePath}", skip the MD5 process on it.`);
        }
    }
    return md5Entries;
}

module.exports = {
    getModules,
    getCurrentScene,
    getProSetting,
    getGroSetting,
    getCustomConfig,
    getScriptsCache,
    initInfo,
    computeArgs,
    requestToPackage,
    getDestPathNoExt,
    updateProgress,
    getRightUrl,
    getAssetUrl,
    getMd5Map,
    appendHashToFileSuffix,
    isNodeModulePath,
};
