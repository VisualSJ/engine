'use strict';

const { EOL } = require('os');
const fse = require('fs-extra');
const ps = require('path');
const Stream = require('stream');

const ipc = require('@base/electron-base-ipc');
const setting = require('@editor/setting');
const logger = require('@base/electron-logger');

/**
 * 将传入的log对象按时间、类型、消息内容进行格式化返回字符串
 * @param {object} log
 * @returns string
 */
function formatLog(log) {
    const time = new Date(log.time).toISOString();
    const type = log.type;
    const message = log.message;
    const stackMessage = log.stack.length ? EOL + log.stack.join(EOL) : '';

    return `${time} - ${type}: ${message}${stackMessage}`;
}

class Logger {

    constructor () {
        // log 存放路径
        this.dirname = ps.join(setting.PATH.HOME, `log`);
        fse.ensureDirSync(this.dirname);

        // 清空之前的 log
        this.clear();

        // 要写入的log文件路径
        this.file = ps.join(this.dirname, `editor-${(new Date()).getTime()}.txt`);

        // 启动 log 记录
        this.starup();
    }

    /**
     * 清除所有的 log
     */
    clear() {
        const files = fse.readdirSync(this.dirname);
        files && files.forEach((name) => {
            if (!name.startsWith('editor-')) {
                return;
            }

            let file = ps.join(this.dirname, name);
            try {
                fse.removeSync(file);
            } catch (error) {}
        });
    }

    /**
     * 启动记录
     */
    starup() {
        // 创建写入流
        const writeStream = fse.createWriteStream(this.file, {flags: 'a'});
        // 创建读取流
        this._readStream = new Stream.Readable({read() {}});
        // 通过管道连接
        this._readStream.pipe(writeStream, { end: false });
    }

    /**
     * 查询指定的 log 数据
     */
    query() {
        return logger.query();
    }

    /**
     * 监听事件
     */
    on(...args) {
        logger.on(...args);
    }
}

module.exports = new Logger();

// 将 log 对象转成格式化字符串后写入文件
logger.on('record', (log) => {
    const data = formatLog(log) + EOL;
    let readStream = module.exports._readStream;
    readStream && readStream.push(data);
});

// 渲染进程调用主进程的方法
ipc.on('editor-lib-logger:call', (event, name, args = []) => {
    if (module.exports[name]) {
        module.exports[name](...args);
    }
});