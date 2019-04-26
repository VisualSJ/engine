'use strict';

/**
 * engine-view 监听的操作事件
 */
const utils = {
    createMouseEvent(event, bcr) {
        return {
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,

            x: event.pageX - bcr.x,
            y: event.pageY - bcr.y,
            deltaX: event.deltaX || 0,
            deltaY: event.deltaY || 0,
            wheelDeltaX: event.wheelDeltaX || 0,
            wheelDeltaY: event.wheelDeltaY || 0,
            moveDeltaX: event.movementX || 0,
            moveDeltaY: event.movementY || 0,
            leftButton: !!(event.buttons & 1) || event.button === 0,
            middleButton: !!(event.buttons & 4) || event.button === 1,
            rightButton: !!(event.buttons & 2) || event.button === 2,
        };
    },
    createKeyboardEvent(event) {
        return {
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            key: event.key,
            keyCode: event.keyCode,
        };
    },
    creatDragEvent(event, bcr) {
        // 容错处理
        if (!Editor.UI.DragArea.currentDragInfo) {
            return;
        }
        const {type, value} = Editor.UI.DragArea.currentDragInfo;
        const newEvent = utils.createMouseEvent(event, bcr);
        newEvent.type = type;
        newEvent.uuid = value;
        return newEvent;
    },
    createConfirmEvent(event) {
        return {
            path: event.target.getAttribute('path'),
            value: event.target.value,
        };
    },
};

const dragSupportTypes = ['cc.Material', 'cc.Prefab', 'cc.Mesh'];
module.exports = function(elem) {
    elem.addEventListener('mousedown', (event) => {
        const bcr = elem.getBoundingClientRect();

        elem.ipc.forceSend('call-method', {
            module: 'Operation',
            handler: 'emit',
            params: ['mousedown', utils.createMouseEvent(event, bcr)],
        });

        function mouseup(event) {
            const bcr = elem.getBoundingClientRect();

            elem.ipc.forceSend('call-method', {
                module: 'Operation',
                handler: 'emit',
                params: ['mouseup', utils.createMouseEvent(event, bcr)],
            });

            document.removeEventListener('mouseup', mouseup);
        }

        document.addEventListener('mouseup', mouseup);
    });

    elem.addEventListener('mousemove', (event) => {
        const bcr = elem.getBoundingClientRect();

        // 窗口失去焦点时，第一次点击窗口会发送一个没有偏移的mousemove事件，在这里剔除
        if (event.movementX !== 0 || event.movementY !== 0) {
            elem.ipc.forceSend('call-method', {
                module: 'Operation',
                handler: 'emit',
                params: ['mousemove', utils.createMouseEvent(event, bcr)],
            });
        }
    });

    elem.addEventListener('wheel', (event) => {
        const bcr = elem.getBoundingClientRect();

        elem.ipc.forceSend('call-method', {
            module: 'Operation',
            handler: 'emit',
            params: ['wheel', utils.createMouseEvent(event, bcr)],
        });
    });

    elem.addEventListener('keydown', (event) => {
        elem.ipc.forceSend('call-method', {
            module: 'Operation',
            handler: 'emit',
            params: ['keydown', utils.createKeyboardEvent(event)],
        });
    });

    elem.addEventListener('keyup', (event) => {

        elem.ipc.forceSend('call-method', {
            module: 'Operation',
            handler: 'emit',
            params: ['keyup', , utils.createKeyboardEvent(event)],
        });
    });

    elem.addEventListener('dragover', (event) => {
        const bcr = elem.getBoundingClientRect();
        const newEvent = utils.creatDragEvent(event, bcr);
        if (newEvent && !dragSupportTypes.includes(newEvent.type)) {
            return;
        }
        event.preventDefault(); // 阻止原生事件，不添加 drop 事件无法触发
        elem.ipc.forceSend('call-method', {
            module: 'Asset',
            handler: 'onDragOver',
            params: [newEvent],
        });
    });

    elem.addEventListener('drop', (event) => {
        event.preventDefault();
        const bcr = elem.getBoundingClientRect();
        elem.ipc.forceSend('call-method', {
            module: 'Asset',
            handler: 'onDrop',
            params: [utils.creatDragEvent(event, bcr)],
        });
    });

    elem.addEventListener('confirm', (event) => {
        elem.ipc.forceSend('call-method', {
            module: 'MinWindow',
            handler: 'onConfirm',
            params: [utils.createConfirmEvent(event)],
        });
    });
};
