const buildResult = require('./build-result');
const platfomConfig = require('./platforms-config');
const { sortScripts, updateProgress} = require('./utils');
const Browserify = require('browserify');
const gulp = require('gulp');
const {readFileSync} = require('fs');
const {join, basename, extname} = require('path');
// // misc
const source = require('vinyl-source-stream');
const viniBuffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');
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
        this.paths = buildResult.paths;
        this.options = buildResult.options;
        let util = join(this.paths.engine, 'gulp/util/utils');
        this.uglify = require(util).uglify;

    }

    async build(scripts) {
        updateProgress('build scripts...');
        if (!scripts || scripts.length < 1) {
            updateProgress('build scripts sucess', 15);
            return;
        }
        this.init();
        let scriptInfo = sortScripts(scripts); // 分类脚本，分为子包和主包
        this._allScripts = scriptInfo.allScripts;
        rawPathToLibPath = scriptInfo.rawPathToLibPath;
        await this._buildScript(scriptInfo.mainScrips);
        // await this._buildScript(scriptInfo.subScrips);
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

            let isNative = !!platfomConfig[options.platform].isNative;
            // bundle = bundle.pipe(this.uglify('build', {
            //     jsb: isNative,
            //     wechatgame: options.platform === 'wechatgame',
            //     qqplay: options.platform === 'qqplay',
            //     debug: options.debug,
            // }));

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

// 把脚本重新定位到 raw file，这样才能输出正确的编译路径。
function patchBrowserifyToRedirectPathToRaw(browserify) {
    if (!browserify._bresolve) {
        let error = new Error('Failed to patch browserify');
        if (gulp.isRunning) {
            gulp.stop(error);
        }
        return;
    }

    // var dir = Path.join(paths.proj, SCRIPT_SRC);

    browserify.__bresolve = browserify._bresolve;
    browserify._bresolve = function resolve(id, opts, cb) {
        browserify.__bresolve(id, opts, function(err, file, pkg) {
            if (err) {
                if (opts && opts.filename) {
                    // still resolve required script in raw directory
                    var rawPath = libPathToRawPath[opts.filename] || libPathToRawPath[opts.filename.toLowerCase()];
                    if (rawPath) {
                        opts.filename = rawPath;
                        opts.basedir = dirname(rawPath);
                        return resolve(id, opts, cb);
                    } else {
                        console.warn(`Failed to resolve script "${id}" in raw directory: `, opts);
                    }
                }
                // else if (opts) {
                //     console.warn(`Failed to resolve script "${id}", filename invalid`, opts);
                // }
                return cb(null, file, pkg);
            }
            // redirect raw script to imported
            var libPath = rawPathToLibPath[file];
            if (!libPath) {
                libPath = rawPathToLibPath[file.toLowerCase()];
                if (libPath) {
                    console.log(`resolve "${id}" to "${libPath}" by ignoring case mistake`);
                }
            }
            file = libPath || file;
            return cb(null, file, pkg);
        });
    };
}
module.exports = new ScriptBuilder();
