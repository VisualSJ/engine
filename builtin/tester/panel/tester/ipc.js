'use strict';

let map = {};

/**
 * 清空之前的记录，并重新开始记录 Ipc 消息
 */
function record() {
    map = {};
}

/**
 * 接收一条消息
 * @param {*} message
 * @param  {...any} args
 */
function receive(message, ...args) {
    map[message] = map[message] || [];
    map[message].push({
        time: Date.now(),
        params: args,
    });
}

/**
 * 查询某个消息接收的次数
 * @param {*} message
 */
function count(message) {
    if (!map[message]) {
        return 0;
    }
    return map[message].length;
}

/**
 * 获取一个广播消息的记录对象
 * @param {*} message
 * @param {*} index
 */
function get(message, index) {
    index = index || 0;

    if (!map[message]) {
        return null;
    }

    return map[message][index] || null;
}

exports.record = record;
exports.receive = receive;
exports.count = count;
exports.get = get;
