'use strict';

const uuid = require('./source/uuid');
const file = require('./source/file');
const math = require('./source/math');

class Utils {
    // worker 内调用的 hack ，其他地方不要使用
    get Path() {
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
}

module.exports = new Utils();
