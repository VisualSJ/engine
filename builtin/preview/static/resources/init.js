// socket
// =======================
window.socket = io();
window.q = document.querySelector.bind(document);
window.hasError = false;
// 显示加载错误
function showLoadError(message) {
    socket.emit('preview error', message);
    q('#splash').style.display = 'none';
    q('#error').style.display = 'block';
    q('#error .error-main').innerText += message;
}

// 全局捕获错误
window.addEventListener(
    'error',
    function(args) {
        window.hasError = true;
        var eventType = [].toString.call(args, args);
        if (eventType === '[object Event]') {
            // 加载错误,显示错误页面
            showLoadError(`load ${args.target.src} failed`);
            return true;
        } else {
            console.error(args);
            args[0] = 'Preview error:' + args[0];
            socket.emit('preview error', ...args);
            return true; // 注意，在返回 true 的时候，异常才不会继续向上抛出error;
        }
    },
    true
);
