const TreeKill = require('tree-kill');

let _previewProcess; // 标识模拟器预览进程是否存在

// 停止运行
function stop() {
    if (_previewProcess) {
        TreeKill(_previewProcess.pid);
        _previewProcess = null;
    }
}

// 开始运行
function run() {
    stop();
}
module.exports = {
    run,
    stop
};
