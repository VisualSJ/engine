'use strict';

const fse = require('fs-extra');
const ps = require('path');
const os = require('os');
const Stream = require('stream');

const setting = require('@editor/setting');
const logger = require('@base/electron-logger');

const EOL = os.EOL;
// 要写入的log文件路径
const filePath = ps.join(setting.PATH.HOME, 'log/log.txt');
// 启动时清除log文件
fse.removeSync(filePath);
// 创建写入流
const writeStream = fse.createWriteStream(filePath, { flags: 'a' });
// 创建读取流
const readStream = new Stream.Readable({
    read() {}
});
// 通过管道连接
readStream.pipe(
    writeStream,
    { end: false }
);

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

/**
 * record监听事件
 * 将log对象转成格式化字符串后写入文件
 * @param {object} log
 */
function record(log) {
    const data = formatLog(log) + EOL;
    readStream.push(data);
}

logger.on('record', record);

module.exports = logger;
