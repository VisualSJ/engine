'use strict';

/**
 * 编码 error 对象
 * 因为 ipc 消息在发送的过程中会丢失类型数据
 * @param {*} error
 */
let serializeError = function(error) {
    if (!error) {
        return null;
    }
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
    };
};

/**
 * 解码 error 对象
 * @param {*} obj
 */
let deserializeError = function(obj) {
    if (!obj) {
        return null;
    }
    let error = new Error();
    error.name = obj.name;
    error.message = obj.message;
    error.stack = obj.stack;
    return error;
};

module.exports = {
    serializeError,
    deserializeError,
};
