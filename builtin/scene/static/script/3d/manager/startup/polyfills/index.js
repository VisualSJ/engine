'use strict';

function editor() {
    // HACK: 设置 CC_EDITOR 标记，引擎加载的时候会使用标记进行部分判断
    window.CC_EDITOR = true;
    // HACK: 模拟 Editor，防止引擎加载的时候报错
    require('./editor');
}

function engine() {
    // HACK: 模拟 cc.engine，防止引擎运行时报错
    require('./engine');
}

exports.editor = editor;
exports.engine = engine;
