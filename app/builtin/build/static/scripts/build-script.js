const buildResult = require('./build-result');
const platfomConfig = require('./platforms-config');
const {updateProgress, requestToPackage, getRightUrl, getScriptsCache} = require('./utils');
const Browserify = require('browserify');
const gulp = require('gulp');
const {readFileSync, copyFileSync} = require('fs');
const {ensureDirSync} = require('fs-extra');
const {join, basename, extname, dirname} = require('path');
const projectScripts = require('./project-scripts'); // 配置构建的脚本环境
// // misc
const source = require('vinyl-source-stream');
const viniBuffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');

// browserify prelude
const prelude = readFileSync(join(__dirname, './_prelude.js'), 'utf8');
const CAN_NOT_FIND = 'Cannot find module ';
var COMPILE_ERR_TAG = 'Compile error:';
var ERROR_PREFIX = 'Error: ';    // 去掉异常自动加上的前缀
let rawPathToLibPath = {};
/**
 * 构建打包脚本的类
 * @class ScriptsBuilder
 */
class ScriptBuilder {
    init() {
        this.shoudBuild = true;
        if (!buildResult.options || buildResult.options.type !== 'build-release') {
            this.shoudBuild = false;
            return;
        }
        this.paths = buildResult.paths;
        this.options = buildResult.options;
        this.jsList = [];
    }

    async build() {
        updateProgress('build scripts...');
        this.init();
        let scripts = await requestToPackage('asset-db', 'query-assets', {type: 'scripts'});
        let result = await projectScripts.load(scripts);
        result.scripts = await  getScriptsCache(result.scripts);
        if (!this.shoudBuild) {
            return result;
        }
        let scriptInfo = this.sortScripts(scripts); // 查询、分类脚本，分为子包和主包
        this._allScripts = scriptInfo.allScripts;
        rawPathToLibPath = scriptInfo.rawPathToLibPath;
        await this._buildScript(scriptInfo.mainScrips);
        await this.copyFiles(result.jsList);
        return result;
    }

    // 将脚本根据子包设置，分类
    sortScripts(scripts) {
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
            let rawPath = join(this.paths.project, getRightUrl(script.source));
            let libraryPath = script.library['.js'];
            rawPathToLibPath[rawPath] = libraryPath;
            mainScrips.push(rawPath);
        });
        return {
            mainScrips,
            subScrips,
            allScripts: mainScrips,
            rawPathToLibPath,
        };
    }

    _buildScript(srcPaths) {
        return new Promise((resolve, reject) => {
            if (srcPaths.length < 1) {
                resolve();
                return;
            }
            // sort scripts for https://github.com/cocos-creator/fireball/issues/4854
            srcPaths.sort();
            let options = this.options;
            let paths = this.paths;
            let opt = {
                debug: !!options.sourceMaps,
                basedir: paths.project,
                builtins: [
                    // See: node_modules/Browserify/lib/builtins.js
                    'assert',
                    'buffer',
                    //'child_process',
                    //'cluster',
                    'console',
                    'constants',
                    'crypto',
                    //'dgram',
                    //'dns',
                    'domain',
                    'events',
                    //'fs',
                    'http',
                    'https',
                    //'module',
                    //'net',
                    'os',
                    'path',
                    'punycode',
                    'querystring',
                    //'readline',
                    //'repl',
                    'stream',
                    '_stream_duplex',
                    '_stream_passthrough',
                    '_stream_readable',
                    '_stream_transform',
                    '_stream_writable',
                    'string_decoder',
                    'sys',
                    'timers',
                    //'tls',
                    'tty',
                    'url',
                    'util',
                    'vm',
                    'zlib',
                    '_process',
                ],
                extensions: ['.ts', '.coffee'],
                ignoreMissing: true,
                externalRequireName: 'window.__require',
                prelude: prelude,
                // detectGlobals: false
                // browserField: false
            };

            let browserify;
            // 缓存的配置好打包参数的 Browserify 实例化对象
            if (options.cacheBrowserify) {
                // https://github.com/royriojas/persistify
                browserify = persistify(opt, {
                    recreate: options.recreateCache,
                    cacheId: options.platform + '_' + !!options.debug + '_' + !!options.sourceMaps,
                    cacheDir: options.cacheBrowserify,
                });
            } else {
                // 用来打包编译脚本便于在浏览器中使用
                // https://github.com/substack/node-Browserify#methods
                browserify = new Browserify(opt);
            }

            // patchBrowserifyToRedirectPathToRaw(browserify);

            for (let i = 0; i < srcPaths.length; ++i) {
                var file = srcPaths[i];
                browserify.add(rawPathToLibPath[file]);
                // expose the filename so as to avoid specifying relative path in require()
                browserify.require(rawPathToLibPath[file], {
                    expose: basename(file, extname(file)),
                });
            }

            // for (let i = 0; i < allScripts.length; ++i) {
            //     let file = allScripts[i];
            //     if (srcPaths.indexOf(file) === -1) {
            //         browserify.exclude(rawPathToLibPath[file]);
            //     }
            // }

            let bundle = browserify.bundle()
                .on('error', function(error) {
                    error = new Error(nicifyError(error));
                    if (gulp.isRunning) {
                        gulp.stop(error);
                    }
                })
                .pipe(source(paths.bundledScript));

            // Uglify
            bundle = bundle.pipe(viniBuffer());

            if (options.sourceMaps) {
                bundle = bundle.pipe(sourcemaps.init({loadMaps: true}));
            }

            // let isNative = !!platfomConfig[options.platform].isNative;
            // bundle = bundle.pipe(uglify('build', {
            //     jsb: isNative,
            //     wechatgame: options.platform === 'wechatgame',
            //     qqplay: options.platform === 'qqplay',
            //     debug: options.debug,
            // }));
            bundle = bundle.pipe(uglify());
            // bundle = bundle.pipe();
            if (options.sourceMaps) {
                bundle = bundle.pipe(refineSourceMap(rawPathToLibPath, paths.project))
                                .pipe(sourcemaps.write('./'));
            }

            bundle = bundle.pipe(gulp.dest(paths.project));

            bundle.on('end', (error) => {
                if (error) {
                    reject(error);
                }
                updateProgress('build scripts sucess', 15);
                // todo 细节优化
                resolve();
            });
        });
    }
    copyFiles(files) {
        if (files.length === 0) {
            return;
        }
        return new Promise((resolve) => {
            Promise.all(files.map((url) => {
                const src = join(this.paths.project, url);
                const dest = join(this.paths.src, url);
                ensureDirSync(dirname(dest));
                copyFileSync(src, dest);
            })).then(() => {
                resolve();
            }).catch((err) => console.error(err));
        });
    }
}

// 查询当前项目配置的子包信息
function querySubPackages() {
    // todo 查询子包
    return [];
}
// 错误处理函数
function nicifyError(error) {
    function matchFormat(str, prefix, suffix) {
        if (str.startsWith(prefix)) {
            if (suffix) {
                if (str.endsWith(suffix)) {
                    return str.slice(prefix.length, -suffix.length);
                }
            } else {
                return str.slice(prefix.length);
            }
        }
        return '';
    }

    var msg = (error.message || error.toString()).trim();
    if (!msg) {
        return error;
    }

    var path;
    path = matchFormat(msg, "ENOENT, open '", ".js'");
    if (path) {
        // ENOENT, open '/Users/**/temp/scripts/**/*.js', then means 'module not found'
        let module = basename(path, extname(path));
        return `${COMPILE_ERR_TAG} Cannot require '${module}', module not found, ${msg}`;
    }

    path = matchFormat(msg, "ENOENT: no such file or directory, open '", ".js'");
    if (path) {
        // ENOENT: no such file or directory, open '/Users/**/temp/scripts/**/*js', then means 'module not found'
        let module = basename(path, extname(path));
        return `${COMPILE_ERR_TAG} Cannot require '${module}', module not found, ${msg}`;
    }

    if (matchFormat(msg, CAN_NOT_FIND)) {
// Error: Cannot find module 'NewScript.js' from '/Users/jareguo/Temp/NewProjectfsadfdsweq/temp/scripts/assets/Script'
        let leftQuotePos = CAN_NOT_FIND.length + 1;
        let rightQuotePos = msg.indexOf("'", leftQuotePos);
        if (rightQuotePos === -1) { return msg; }
        let module = msg.slice(leftQuotePos, rightQuotePos);
        let noPath = basename(module) === module;
        if (noPath) {
            let hasExt = !!extname(module);
            if (hasExt) {
                return `${COMPILE_ERR_TAG} Cannot require '${module}', module not found,
                 please remove file extension and retry.( just "require('${basename(module, extname(module))}');"`;
            }
        }
        msg = msg.replace(CAN_NOT_FIND, 'Cannot require ') + '. Module not found.';
    }

    if (error.annotated) {
        msg = msg + '\n' + error.annotated;
    }
    return COMPILE_ERR_TAG + ' ' + msg;
}
module.exports = new ScriptBuilder();
