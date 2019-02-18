'use strict';
const {join} = require('path');
const {readJSONSync, existsSync} = require('fs-extra');
const setting = require('@editor/setting');
// 在 logger 启动前打印相应的启动数据
let str = 'Arguments:';
Object.keys(setting.args).forEach((key) => {
    str += `
        ${key}: ${setting.args[key]}`;
});
console.log(str);

let data = {
    version: '1.0.0',
    name: 'creator 3D',
};
const pkgPath = join(setting.PATH.APP, 'package.json');
if (!existsSync(pkgPath)) {
    console.error('package.json is not exit!');
} else {
    data = readJSONSync(pkgPath);
}

// 存储 app 相关信息与调用接口等
const App = {
    get home() {
        return setting.PATH.HOME;
    },
    get path() {
        return setting.PATH.APP;
    },
    get project() {
        return setting.PATH.PROJECT;
    },
    get version() {
        return data.version;
    },
    get name() {
        return data.name;
    },
    get dev() {
        return setting.dev;
    },
};

module.exports = App;
