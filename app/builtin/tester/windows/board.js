'use strict';

const codeMap = {
    Enter: 'Enter',
    Escape: 'Escape',
};

const keyCodeMap = {
    Enter: 13,
    Escape: 27,
};

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms || 200);
    });
}

exports.keydown = async function(element, key) {
    const event = new KeyboardEvent('', {
        bubbles: true,
        cancelable: true,
        code: codeMap[key] || `Key${key.toLocaleUpperCase()}`,
        composed: true,
        eventPhase: 2,
        isTrusted: true,
        key: codeMap[key] || key,
        keyCode: keyCodeMap[key] || key.charCodeAt(0),
        which: keyCodeMap[key] || key.charCodeAt(0),
    });
    event.initEvent('keydown', true, true);
    element.dispatchEvent(event);
    await wait(50);
}

exports.keypress = async function(element, key) {
    const event = new KeyboardEvent('', {
        bubbles: true,
        cancelable: true,
        code: codeMap[key] || `Key${key.toLocaleUpperCase()}`,
        composed: true,
        eventPhase: 2,
        isTrusted: true,
        key: codeMap[key] || key,
        keyCode: keyCodeMap[key] || key.charCodeAt(0),
        which: keyCodeMap[key] || key.charCodeAt(0),
    });
    event.initEvent('keypress', true, true);
    element.dispatchEvent(event);
    await wait(50);
}

exports.keyup = async function(element, key) {
    const event = new KeyboardEvent('', {
        bubbles: true,
        cancelable: true,
        code: codeMap[key] || `Key${key.toLocaleUpperCase()}`,
        composed: true,
        eventPhase: 2,
        isTrusted: true,
        key: codeMap[key] || key,
        keyCode: keyCodeMap[key] || key.charCodeAt(0),
        which: keyCodeMap[key] || key.charCodeAt(0),
    });
    event.initEvent('keyup', true, true);
    element.dispatchEvent(event);
    await wait(50);
}

exports.input = async function(element, string) {
    for (let i = 0; i < string.length; i++) {
        await exports.keydown(element, string[i]);
        await exports.keypress(element, string[i]);
        element.value = element.value + string[i];
        await exports.keyup(element, string[i]);
    }

    await wait(200);
}

exports.enter = async function(element) {
    exports.keydown(element, 'Enter');
    exports.keyup(element, 'Enter');
    await wait(200);
}

exports.esc = async function(element) {
    exports.keydown(element, 'Escape');
    exports.keyup(element, 'Escape');
    await wait(200);
}