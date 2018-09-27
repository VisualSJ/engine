const Path = require('path');

const QuickCompiler = require('./index.js');

// plugins 下的插件用来处理编译源码相关任务
const babelPlugin = require('./plugins/babel');
const modulePlugin = require('./plugins/module');

// engine-utils 下的插件用来辅助引擎其他任务
const deleteEngineCache = require('./engine-utils/delete-engine-cache');

let buildEngine = (options, cb) => {
    if (!options.enginePath) {
        cb(new Error('Please specify the engine path'));
        return null;
    }

    let compiler = new QuickCompiler();

    function enginePath(path) {
        return Path.join(options.enginePath, path || '');
    }

    let opts = {
        root: enginePath(),
        entries: [enginePath('index.js')],
        out: enginePath('bin/.cache/dev'),
        plugins: [
            babelPlugin(),
            modulePlugin({
                transformPath(src, dst, compiler) {
                    return Path.join('engine-dev', Path.relative(compiler.out, dst));
                }
            }),

            deleteEngineCache(enginePath),
        ],
        clear: false,
        onlyRecordChanged: true
    };

    if (options.enableWatch) {
        compiler.watch(opts, cb);
    } else {
        compiler.build(opts, cb);
    }

    return compiler;
};

module.exports = buildEngine;
