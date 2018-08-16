'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './button.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './button.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 绑定键盘事件的绑定与解绑
 * @param {Element} elem
 * @param {Boolean} detach
 */
const controlKeyboardEvent = function (elem, detach = false) {
    elem._keyboardEventHandle = (function (elem) {
        const _keyDown = event => {
            switch (event.keyCode) {
                case 32:
                case 13:
                    elem.setAttribute('pressed', '');
                    break;
            }
        }

        const _keyUp = event => {
            switch (event.keyCode) {
                case 32:
                case 13:
                    elem.removeAttribute('pressed');
                    break;
            }
        }

        return {
            _keyDown,
            _keyUp
        }
    })(elem);

    if (detach) {
        elem.removeEventListener('keydown', elem._keyboardEventHandle._keyDown);
        elem.removeEventListener('keyup', elem._keyboardEventHandle._keyUp);
    } else {
        elem.addEventListener('keydown', elem._keyboardEventHandle._keyDown);
        elem.addEventListener('keyup', elem._keyboardEventHandle._keyUp);
    }
};

/**
 * 绑定鼠标事件的绑定与解绑
 * @param {Element} elem
 * @param {Boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    elem._mouseEventHandle = (function (elem) {
        const _buttonUp = () => {
            elem.removeAttribute('pressed');
            document.removeEventListener('mouseup', _buttonUp);
        };

        const _mouseDown = () => {
            if (elem.disabled) {
                return;
            }
            elem.setAttribute('pressed', '');
            elem.confirm();
            document.addEventListener('mouseup', _buttonUp);
        }

        return {
            _buttonUp,
            _mouseDown
        }
    })(elem)

    if (detach) {
        elem.removeEventListener('mousedown', elem._mouseEventHandle._mouseDown);
    } else {
        elem.addEventListener('mousedown', elem._mouseEventHandle._mouseDown);
    }
};

/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class Button extends Base {
    static importStyle(src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(instance => {
                const el = instance.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    constructor() {
        super();
        this.shadowRoot.innerHTML = createDomContent();
        this._mouseEventHandle = {};
        this._keyboardEventHandle = {};
    }

    connectedCallback() {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
        controlKeyboardEvent(this);
        controlMouseEvent(this);
    }

    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback()
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
        controlKeyboardEvent(this, true);
        controlMouseEvent(this, true);
    }

    // get set focused
    // get set disabled
}

module.exports = Button;
