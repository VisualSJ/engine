'use strict';

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms || 200);
    });
}

function point(x, y) {
    const $div = document.createElement('div');
    $div.style.background = '#fff';
    $div.style.opacity = 0.6;
    $div.style.position = 'absolute';
    $div.style.width = '20px';
    $div.style.height = '20px';
    $div.style.borderRadius = '10px';
    $div.style.transition = 'all 0.4s';

    $div.style.left = x - 10 + 'px';
    $div.style.top = y - 10 + 'px';

    requestAnimationFrame(() => {
        $div.style.transform = 'scale(0.2)';
    });

    setTimeout(() => {
        $div.style.transform = 'scale(1)';
        $div.style.opacity = 0;
    }, 200);

    setTimeout(() => {
        $div.remove();
    }, 400);

    document.body.appendChild($div);
}

exports.click = async function(element, ctrl, shift, alt) {
    const rect = element.getBoundingClientRect();

    const x = (rect.right - rect.left) / 2 + rect.x;
    const y = (rect.bottom - rect.top) / 2 + rect.y;

    point(x, y);

    await exports.mouseDown(element);
    element.focus();
    await exports.mouseUp(element);

    const prect = element.parentElement ? element.parentElement.getBoundingClientRect() : rect;
    const event = new MouseEvent('', {
        ctrlKey: !!ctrl,
        shiftKey: !!shift,
        altKey: !!alt,
        metaKey: !!alt,

        clientX: x,
        clientY: y,
        offsetX: x - prect.x,
        offsetY: y - prect.y,
        screenX: 0,
        screenY: 0,

        button: 0, // 0,1,2
        buttons: 0, // 1,2,4
        composed: true,
        detail: 1,
        isTrusted: true,
    });
    event.initEvent('click', true, true);
    element.dispatchEvent(event);

    await wait(200);
}

exports.mouseDown = async function(element, ctrl, shift, alt) {
    const rect = element.getBoundingClientRect();

    const x = (rect.right - rect.left) / 2 + rect.x;
    const y = (rect.bottom - rect.top) / 2 + rect.y;

    const prect = element.parentElement ? element.parentElement.getBoundingClientRect() : rect;
    const event = new MouseEvent('', {
        ctrlKey: !!ctrl,
        shiftKey: !!shift,
        altKey: !!alt,
        metaKey: !!alt,

        clientX: x,
        clientY: y,
        offsetX: x - prect.x,
        offsetY: y - prect.y,
        screenX: 0,
        screenY: 0,

        button: 0, // 0,1,2
        buttons: 0, // 1,2,4
        composed: true,
        detail: 1,
        isTrusted: true,
    });
    event.initEvent('mousedown', true, true);
    element.dispatchEvent(event);

    await wait(200);
}

exports.mouseUp = async function(element, ctrl, shift, alt) {
    const rect = element.getBoundingClientRect();

    const x = (rect.right - rect.left) / 2 + rect.x;
    const y = (rect.bottom - rect.top) / 2 + rect.y;

    const prect = element.parentElement ? element.parentElement.getBoundingClientRect() : rect;
    const event = new MouseEvent('', {
        ctrlKey: !!ctrl,
        shiftKey: !!shift,
        altKey: !!alt,
        metaKey: !!alt,

        clientX: x,
        clientY: y,
        offsetX: x - prect.x,
        offsetY: y - prect.y,
        screenX: 0,
        screenY: 0,

        button: 0, // 0,1,2
        buttons: 0, // 1,2,4
        composed: true,
        detail: 1,
        isTrusted: true,
    });
    event.initEvent('mouseup', true, true);
    element.dispatchEvent(event);

    await wait(200);
}