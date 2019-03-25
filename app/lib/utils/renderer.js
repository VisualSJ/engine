'use strict';

const uuid = require('./source/uuid');
const file = require('./source/file');
const math = require('./source/math');
const path = require('./source/path');

class Utils {
    // worker 内调用的 hack ，其他地方不要使用
    get path() {
        return __dirname;
    }

    get Uuid() {
        return uuid;
    }

    get Math() {
        return math;
    }

    get File() {
        return file;
    }

    get Path() {
        return path;
    }
}

module.exports = new Utils();
