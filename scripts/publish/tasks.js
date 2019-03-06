'use strict';

const ps = require('path');
const fse = require('fs-extra');
const UglifyJS = require('uglify-es');

const pkg = require('../../package.json');

// 发布目录
const DIRECTORY = ps.join(__dirname, '../../.publish');

// 发布的 .app 名字
const time = new Date();
let month = time.getMonth() + 1;
if (month < 10) {
    month = `0${month}`;
}
let date = time.getDate();
if (date < 10) {
    date = `0${date}`;
}
let hours = time.getHours();
if (hours < 10) {
    hours = `0${hours}`;
}
const ELECTRON = ps.join(DIRECTORY, `${pkg.name}-v${pkg.version}-${process.platform}-${month}${date}${hours}.app`);

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
    if (!fse.existsSync(DIRECTORY)) {
        fse.ensureDirSync(DIRECTORY);
    }
    if (fse.existsSync(ELECTRON)) {
        fse.removeSync(ELECTRON);
    }
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
 * 复制需要打包的开发文件
 */
exports.copyFiles = async function() {
    // await this.bash('git', {
    //     params: ['rev-parse', '--short', 'HEAD', '>', 'version.info'],
    //     root: ps.join(__dirname, '../../'),
    // });

    this.log('复制 app');
    const types = ps.join(__dirname, '../../app');
    fse.copySync(types, APP);
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
