// socket
// =======================
window.socket = io();
window.q = document.querySelector.bind(document);
window.hasError = false;
// 显示加载错误
function showError(message) {
    q('#splash').style.display = 'none';
    q('#error').style.display = 'block';
    q('#error .error-main').innerText += message;
    message = '[preview-error]' + message;
    socket.emit('preview error', message);
}

// 全局捕获错误
window.addEventListener(
    'error',
    function(err) {
        window.hasError = true;
        var eventType = [].toString.call(err, err);
        if (eventType === '[object Event]') {
            // 加载错误,显示错误页面
            showError(`load ${err.target.src} failed`);
            return true;
        } else {
            showError(`${err.message} in ${err.filename}

            `);
            return true; // 注意，在返回 true 的时候，异常才不会继续向上抛出error;
        }
    },
    true
);
