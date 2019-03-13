'use strict';

const ps = require('path');
const fse = require('fs-extra');
const UglifyJS = require('uglify-es');
const plist = require('plist');

const pkg = require('../../app/package.json');

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
    this.log('复制 app');
    const types = ps.join(__dirname, '../../app');
    fse.copySync(types, APP);
};

/**
 * 复制内置引擎
 */
exports.copyResources = function() {
    this.log(`复制内置引擎`);
    const dir = ps.join(__dirname, '../../resources');
    fse.copySync(dir, ps.join(APP, '../resources'), {
        filter(name) {
            return name[0] !== '.';
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
            file.includes('node_modules')
        ) {
            return;
        }
        try {
            this.log(file);
            const code = fse.readFileSync(file, 'utf8');
            const result = UglifyJS.minify(code);
            if (result.error) {
                console.error(`文件压缩失败: ${file}`);
                console.error(result.error);
            }
            fse.outputFileSync(file, result.code);
        } catch (error) {
            console.error(`文件压缩失败: ${file}`);
            console.error(error);
        }
    });
};

/**
 * 将 app 打包成 asar
 */
exports.asar = async function() {
    // todo 开个子进程打包，因为 asar 会直接中断进程
    const unpacks = [
        'node_modules/@editor/fbx2gltf',
        'node_modules/@editor/robotjs',
    ];

    const asar = require('asar');

    await new Promise((resolve, reject) => {
        asar.createPackageWithOptions(
            APP, ps.join(APP, '../app.asar'), {
                // key: '1213_the_wasted_time', 
                unpack: '*.node',
                unpackDir: `{${unpacks.join(',')}}`,
            }, () => {
                this.log('123')
                resolve();
            }
        );
    });

    fse.removeSync(APP);
};

/**
 * 将 info.plist 内的数据替换成编辑器数据
 */
exports.replaceInfo = async function() {
    if (process.platform === 'darwin') {
        const CONTENTS = ps.join(ELECTRON, 'Contents');

        fse.removeSync(ps.join(APP, '../electron.icns'));
        fse.copySync(ps.join(__dirname, '../../static/editor.icns'), ps.join(APP, '../editor.icns'));
        

        [
            './Info.plist',
            './Frameworks/Electron Helper.app/Contents/Info.plist',
            './Frameworks/Electron Helper EH.app/Contents/Info.plist',
            './Frameworks/Electron Helper NP.app/Contents/Info.plist'
        ].forEach((file) => {
            file = ps.join(CONTENTS, file);
            let data = plist.parse(fse.readFileSync(file, 'utf8'));
            data['CFBundleDisplayName'] = 'Editor3D';
            data['CFBundleExecutable'] = 'Editor3D';
            data['CFBundleName'] = 'Editor3D';
            data['CFBundleIconFile'] = 'editor.icns';
            data['CFBundleIdentifier'] = 'com.cocos.creator';
            data['CFBundleShortVersionString'] = pkg.version;
            data['CFBundleVersion'] = pkg.version;
            data['NSAppTransportSecurity'] = { NSAllowsArbitraryLoads: true };
            data = plist.build(data);
            fse.outputFileSync(file, data);
        });

        [
            './MacOS/Electron',
            './Frameworks/Electron Helper EH.app',
            './Frameworks/Electron Helper NP.app',
            './Frameworks/Electron Helper.app',
            './Frameworks/CocosCreator Helper EH.app/Contents/MacOS/Electron Helper EH',
            './Frameworks/CocosCreator Helper NP.app/Contents/MacOS/Electron Helper NP',
            './Frameworks/CocosCreator Helper.app/Contents/MacOS/Electron Helper',
        ].forEach((file) => {
            const source = ps.join(CONTENTS, file);
            fse.moveSync(source, source.replace(/Electron/, 'Editor3D'));
        });
    } else {

    }
};
