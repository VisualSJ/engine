'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');
const DomUtils = require('../../domUtils');
let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './input.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './input.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach 
 */
const controlMouseEvent = function (elem, detach = false) {
    if (detach) {
        elem.$input.removeEventListener('blur', elem._mouseEventHandles._onBlur);
        elem.$input.removeEventListener('input', elem._mouseEventHandles._onChange);
        elem.$input.removeEventListener('focus', elem._mouseEventHandles._onFocus);
    } else {
        elem._mouseEventHandles = (function (elem) {
            const _onBlur = () => {
                if (elem.changeFlag) {
                    elem.oldValue = elem.value;
                    elem.confirm();
                    elem.changeFlag = false;
                }
            }

            const _onChange = () => {
                elem.$input.setAttribute('value', elem.$input.value);
                elem.value = elem.$input.value;
                emitChange(elem);
            }

            const _onFocus = () => {
                elem.$input.focus();
                elem.oldValue = elem.value;
            }

            return {
                _onBlur,
                _onChange,
                _onFocus
            }
        })(elem);

        elem.$input.addEventListener('focus', elem._mouseEventHandles._onFocus);
        elem.$input.addEventListener('blur', elem._mouseEventHandles._onBlur);
        elem.$input.addEventListener('input', elem._mouseEventHandles._onChange);
    }
};

/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (elem, detach = false) {
    if (detach) {
        elem.removeEventListener('keydown', elem._keyboardEventHandle);
    } else {
        elem._keyboardEventHandle = (function (elem) {
            const keyboardEventHandle = event => {
                switch (event.keyCode) {
                    case 13:
                        elem.value = elem.$input.value;
                        if (elem.changeFlag) {
                            elem.oldValue = elem.value;
                            elem.confirm();
                        }
                        elem.changeFlag = false;
                        break;
                    case 27:
                        elem.value = elem.oldValue;
                        elem.$input.value = elem.oldValue;
                        emitCancel(elem);
                        elem.changeFlag = false;
                        break;
                }
            };
            return keyboardEventHandle;
        })(elem)
        elem.addEventListener('keydown', elem._keyboardEventHandle);
    }
};

/**
 * 派发change事件
 * @param {Element} elem
 */
const emitChange = function (elem) {
    DomUtils.fire(elem, 'change');
    elem.changeFlag = true;
}

/**
 * 派发cancel事件
 * @param {Element} elem
 */
const emitCancel = function (elem) {
    DomUtils.fire(elem, 'cancel');
    elem.changeFlag = false;
}

/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class Input extends Base {
    static importStyle(src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(elem => {
                const el = elem.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    static get observedAttributes() {
        return ['value'];
    }

    constructor() {
        super();
        this.shadowRoot.innerHTML = createDomContent();
        this.$input = this.shadowRoot.querySelector('input');
        this.oldValue = this.getAttribute('value') || '';//oldValue 存储未confirm的旧数据
        this.$input.value = this.getAttribute('value') || '';
        this.$input.placeholder = this.getAttribute('placeholder') || '';
        this.$input.readOnly = this.getAttribute('readonly') !== null;
        this.$input.disabled = this.getAttribute('disabled') !== null;
        this.$input.type = this.getAttribute('password') !== null ? 'password' : 'text';
        this.changeFlag = false;
        this._mouseEventHandles = null;//存储鼠标事件函数
        this._keyboardEventHandle = null;//存储键盘事件函数
    }

    connectedCallback() {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
        if (!this.readOnly && !this.disabled) {
            controlKeyboardEvent(this);
            controlMouseEvent(this);
        }
    }

    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
        if (!this.readOnly && !this.disabled) {
            controlKeyboardEvent(this, true);
            controlMouseEvent(this, true);
        }
    }

    attributeChangedCallback(attr, o, n) {
        switch (attr) {
            case 'value':
                this.$input.value = n;
                break;
        }
    }

    get value() {
        return this.getAttribute('value') || '';
    }

    set value(val) {
        val += '';
        this.setAttribute('value', val);
        this.$input.setAttribute('value', val);
    }

    get placeholder() {
        return this.$input.getAttribute('placeholder');
    }

    set placeholder(val) {
        this.$input.setAttribute('placeholder', val);
    }

    get readOnly() {
        return this.$input.readOnly;
    }

    set readOnly(val) {
        this.$input.readOnly = !!val;
    }

    get disabled() {
        return this.$input.disabled;
    }

    set disabled(val) {
        this.$input.disabled = !!val;
    }

    get password() {
        return s === 'password';
    }

    set password(val) {
        this.$input.type = !!val ? 'password' : 'text';
    }
    ////
    //_mouseEventHandles 定义存储鼠标事件的所有方法
    //_keyboardEventHandle 定义存储键盘事件的所有方法
}

module.exports = Input;
