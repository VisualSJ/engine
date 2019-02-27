'use strict';

const ps = require('path');
const fse = require('fs-extra');
const UglifyJS = require('uglify-es');

const pkg = require('../../package.json');
// 发布目录
const DIRECTORY = ps.join(__dirname, '../../.publish');
// 发布的 .app 名字
const ELECTRON = ps.join(DIRECTORY, `${pkg.name}-v${pkg.version}-${process.platform}-x64.app`);
// 发布程序内的 app 目录
const APP = process.platform === 'win' ?
    ps.join(ELECTRON, './resources/app') :
    ps.join(ELECTRON, './Contents/Resources/app');

const cmd = {
    tsc: process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
    lessc: process.platform === 'win32' ? 'lessc.cmd' : 'lessc',
    asar: process.platform === 'win32' ? 'asar.cmd' : 'asar',
};

/**
 * 检查并创建发布目录
 */
exports.generateElectron = function() {
    // 检查 piblish 文件夹是否存在，并清空重制文件夹
    this.log('生成发布文件夹');
    if (fse.existsSync(DIRECTORY)) {
        fse.emptyDirSync(DIRECTORY);
    } else {
        fse.ensureDirSync(DIRECTORY);
    }
};

/**
 * 复制需要打包的开发文件
 */
exports.copyFiles = function() {
    this.log('复制 @types');
    const types = ps.join(__dirname, '../../@types');
    fse.copySync(types, ps.join(APP, '@types'));

    this.log('复制根目录文件');
    const pkg = ps.join(__dirname, '../../package.json');
    fse.copySync(pkg, ps.join(APP, 'package.json'));
    const boot = ps.join(__dirname, '../../index.js');
    fse.copySync(boot, ps.join(APP, 'index.js'));

    this.log('复制 dashboard');
    const dashboard = ps.join(__dirname, '../../dashboard');
    fse.copySync(dashboard, ps.join(APP, 'dashboard'));

    this.log('复制 lib');
    const lib = ps.join(__dirname, '../../lib');
    fse.copySync(lib, ps.join(APP, 'lib'));

    this.log('复制 builtin');
    const builtin = ps.join(__dirname, '../../builtin');
    fse.copySync(builtin, ps.join(APP, 'builtin'), {
        filter(name) {
            return !name.includes('dist') && !name.includes('readme.md');
        },
    });
};

/**
 * 复制 mac 上的 electron 代码
 */
exports.copyMacElectron = function() {
    // 从 node_modules 里面将 electron 复制出来
    this.log('复制 Electron 代码');
    const source = process.platform === 'win' ?
        ps.join(__dirname, '../../node_modules/electron/dist') :
        ps.join(__dirname, '../../node_modules/electron/dist/Electron.app');
    fse.copySync(source, ELECTRON);
    // 保证 app 文件夹存在
    fse.ensureDirSync(APP);
};

/**
 * 复制第三方模块
 */
exports.copyModules = function() {
    const modules = ps.join(__dirname, '../../node_modules');
    const list = fse.readdirSync(modules);
    list.forEach((name) => {
        this.log(name);
        fse.copySync(ps.join(modules, name), ps.join(APP, 'node_modules', name));
    });
};

/**
 * 复制内置引擎
 */
exports.copyResources = function() {
    this.log(`正在复制内置引擎`);
    const types = ps.join(__dirname, '../../resources');
    fse.copySync(types, ps.join(APP, 'resources'), {
        filter(name) {
            return !name.includes('/.git/');
        },
    });
};

/**
 * 编译 builtin 里面的各种
 */
exports.buildBuiltin = async function() {
    const source = ps.join(APP, './builtin');
    const list = fse.readdirSync(source);

    for (let i = 0; i < list.length; i++) {
        const name = list[i];
        this.log(name);
        const dir = ps.join(source, name);
        if (!fse.statSync(dir).isDirectory()) {
            continue;
        }

        const config = ps.join(dir, 'tsconfig.json');
        if (fse.existsSync(config)) {
            const json = fse.readJSONSync(config);
            json.sourceMap = false;
            json.inlineSourceMap = false;
            json.inlineSources = false;
            fse.writeJSONSync(config, json);

            await this.bash(cmd.tsc, {
                root: dir,
            });
        }

        const less = ps.join(dir, './static/style/index.less');
        if (fse.existsSync(less)) {
            await this.bash(cmd.lessc, {
                params: ['./static/style/index.less', './dist/index.css'],
                root: dir,
            });
        }
    }
};

/**
 * 清除 builtin 里无用的文件
 */
exports.clearBuiltin = async function() {
    const source = ps.join(APP, './builtin');
    const list = fse.readdirSync(source);
    for (let i = 0; i < list.length; i++) {
        const name = list[i];
        this.log(name);
        const dir = ps.join(source, name);
        if (!fse.statSync(dir).isDirectory()) {
            fse.removeSync(dir);
            continue;
        }

        fse.removeSync(ps.join(dir, 'tsconfig.json'));
        fse.removeSync(ps.join(dir, 'source'));
    }
};

/**
 * 构建 theme 里的 less
 */
exports.buildTheme = async function() {
    const DIR = {
        theme: ps.join(APP, './lib/theme'),
        source: ps.join(APP, './lib/theme/source'),
        dist: ps.join(APP, './lib/theme/dist'),
    };

    const files = [];
    this.recursive(DIR.source, (file) => {
        files.push(file);
    });

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.log(file);
        const rPath = ps.relative(DIR.source, file);
        const dPath = ps.join(DIR.dist, rPath).replace('.less', '.css');

        await this.bash(cmd.lessc, {
            params: [file, dPath],
            root: DIR.theme,
        });
    }
};

/**
 * 压缩项目 js 代码
 */
exports.uglifyJs = async function() {
    this.recursive(APP, (file) => {
        if (
            ps.extname(file) !== '.js' ||
            file.indexOf('node_modules') !== -1 ||
            file.indexOf('resources') !== -1 ||
            file.indexOf('engine') !== -1
        ) {
            return;
        }
        try {
            this.log(file);
            const code = fse.readFileSync(file, 'utf8');
            const result = UglifyJS.minify(code);
            if (result.error) {
                throw result.error;
            }
            fse.outputFileSync(file, result.code);
        } catch (error) {
            console.error(`文件压缩失败: ${file}`);
            console.error(error);
        }
    });
};

exports.asar = async function() {
    const asar = ps.join(__dirname, `../../node_modules/.bin/${cmd.asar}`);

    this.log('打包 lib');
    await this.bash(asar, {
        root: APP,
        params: ['pack', 'lib', 'lib.asar'],
    });
    fse.removeSync(ps.join(APP, 'lib'));

    this.log('打包 dashboard');
    await this.bash(asar, {
        root: APP,
        params: ['pack', 'dashboard', 'dashboard.asar'],
    });
    fse.removeSync(ps.join(APP, 'dashboard'));

    const builtin = ps.join(APP, './builtin');
    const list = fse.readdirSync(builtin);
    for (const name of list) {
        this.log(`打包 builtin - ${name}`);
        await this.bash(asar, {
            root: builtin,
            params: ['pack', 'name', `${name}.asar`],
        });
        fse.removeSync(ps.join(builtin, name));
    }
};
