'use strict';

/**
 * engine-view 监听的操作事件
 */

const utils = {
    createMouseEvent(event, bcr) {
        return {
            x: event.pageX - bcr.x,
            y: event.pageY - bcr.y,
            wheelDeltaX: event.deltaX || 0,
            wheelDeltaY: event.deltaY || 0,
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
            key: event.key,
            keyCode: event.keyCode,
        };
    },
};

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

        elem.ipc.forceSend('call-method', {
            module: 'Operation',
            handler: 'emit',
            params: ['mousemove', utils.createMouseEvent(event, bcr)],
        });
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
};
