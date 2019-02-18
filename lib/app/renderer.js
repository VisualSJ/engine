'use strict';
const {join} = require('path');
const {readJSONSync, existsSync} = require('fs-extra');
const setting = require('@editor/setting');

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
