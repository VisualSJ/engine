'use strict';

//////////////
// 27 esc 恢复上一次记录的数据
// 32 space 无特殊响应
// 13 enter 记录数据并触发 confirm
// 38 up / 40 down: 加减 step 数据
// 37 left / 39 right: 无特殊响应

const fs = require('fs');
const path = require('path');

const Base = require('../base');
const DomUtils = require('../../domUtils');
let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './num-input.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './num-input.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 解析数字
 * @param {*} value
 */
let parseNumber = function (value) {
    value = parseFloat(value) - 0;
    if (isNaN(value)) {
        value = 0;
    }
    return value;
};

/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (elem, detach = false) {
    elem._keyboardEventHandle = (function (elem) {
        let _timer = null;
        const _onKeyDown = event => {
            switch (event.keyCode) {
                case 13:
                    elem.value = elem.$input.value;
                    emitConfirm(elem);
                    break;
                case 27:
                    elem.$input.value = parseNumber(elem.getAttribute('value'));
                    elem.value = elem.oldValue;
                    emitCancel(elem);
                    break;
                case 38:
                    clearTimeout(_timer);
                    clearInterval(_timer);
                    _timer = setTimeout(() => {
                        clearInterval(_timer);
                        _timer = setInterval(() => {
                            increasing(elem);
                        }, 50);
                    }, 300);
                    increasing(elem);
                    break;
                case 40:
                    clearTimeout(_timer);
                    clearInterval(_timer);
                    _timer = setTimeout(() => {
                        clearInterval(_timer);
                        _timer = setInterval(() => {
                            diminishing(elem);
                        }, 50);
                    }, 300);
                    diminishing(elem);
                    break;
            }
        };

        const _onKeyUp = event => {
            clearTimeout(_timer);
            clearInterval(_timer);
        };

        return {
            _onKeyDown,
            _onKeyUp
        }
    })(elem);

    if (detach) {
        elem.removeEventListener('keydown', elem._keyboardEventHandle._onKeyDown);
        elem.removeEventListener('keyup', elem._keyboardEventHandle._onKeyUp);
    } else {
        elem.addEventListener('keydown', elem._keyboardEventHandle._onKeyDown);
        elem.addEventListener('keyup', elem._keyboardEventHandle._onKeyUp);
    }
};

/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    elem._mouseEventHandles = (function (elem) {
        let _timer = null;
        const _end = function () {
            clearTimeout(_timer);
            clearInterval(_timer);
            elem.$input.focus();
            document.removeEventListener('mouseup', _end);
        };
        const plusOnMouseDown = () => {
            if (elem.readOnly || elem.disabled) {
                return;
            }
            _timer = setTimeout(() => {
                _timer = setInterval(() => {
                    increasing(elem);
                }, 50);
            }, 300);
            increasing(elem);
            document.addEventListener('mouseup', _end);
        };

        const minusOnMouseDown = () => {
            if (elem.readOnly || elem.disabled) {
                return;
            }
            _timer = setTimeout(() => {
                _timer = setInterval(() => {
                    diminishing(elem);
                }, 50);
            }, 300);
            diminishing(elem);
            document.addEventListener('mouseup', _end);
        };

        const onFocus = () => {
            elem.oldValue = elem.value;
            elem.$input.focus();
        };

        const onBlur = () => {
            let value = elem.$input.value;
            let min = elem.min;
            let max = elem.max;
            if (value > max) {
                value = max;
            } else if (value < min) {
                value = min;
            }
            elem.value = value;
        };

        const onChange = () => {
            elem.$input.setAttribute('value', elem.$input.value)
            elem.value = elem.$input.value;
            emitChange(elem);
        };

        const onInputBlur = () => {
            if (elem.value !== elem.$input.value) {
                elem.value = elem.$input.value;
                let value = elem.$input.value;
                let min = elem.min;
                let max = elem.max;
                if (value > max) {
                    value = max;
                } else if (value < min) {
                    value = min;
                }
                elem.value = value;
                emitConfirm(elem);
            }
        }

        return {
            minusOnMouseDown,
            plusOnMouseDown,
            onChange,
            onInputBlur,
            onFocus,
            onBlur
        }
    })(elem);
    // 按住按钮需要持续增加或持续减少

    if (detach) {
        elem.removeEventListener('focus', elem._mouseEventHandles.onFocus);
        elem.removeEventListener('blur', elem._mouseEventHandles.onBlur);
        elem.$down.removeEventListener('mousedown', elem._mouseEventHandles.minusOnMouseDown);
        elem.$up.removeEventListener('mousedown', elem._mouseEventHandles.plusOnMouseDown);
        elem.$input.removeEventListener('input', elem._mouseEventHandles.onChange);
        elem.$input.removeEventListener('blur', elem._mouseEventHandles.onInputBlur);
    } else {
        elem.addEventListener('focus', elem._mouseEventHandles.onFocus);
        elem.addEventListener('blur', elem._mouseEventHandles.onBlur);
        elem.$down.addEventListener('mousedown', elem._mouseEventHandles.minusOnMouseDown);
        elem.$up.addEventListener('mousedown', elem._mouseEventHandles.plusOnMouseDown);
        elem.$input.addEventListener('input', elem._mouseEventHandles.onChange);
        elem.$input.addEventListener('blur', elem._mouseEventHandles.onInputBlur);
    }
};

const emitConfirm = function (elem) {
    if (elem.changeFlag) {
        elem.oldValue = elem.value;
        DomUtils.fire(elem, 'confirm');
        elem.changeFlag = false;
    }
}

const emitChange = function (elem) {
    DomUtils.fire(elem, 'change');
    elem.changeFlag = true;
}

const emitCancel = function (elem) {
    DomUtils.fire(elem, 'cancel');
    elem.changeFlag = false;
}

/**
 * 数据递增
 */
const increasing = function (elem) {
    let step = parseNumber(elem.step);
    let value = parseNumber(elem.$input.value) + step;
    let max = elem.max;
    if (value >= max) {
        value = max;
    }
    elem.$input.value = value;
    elem.value = elem.$input.value;
    emitChange(elem);
}

/**
 * 数据递减
 */
const diminishing = function (elem) {
    let step = parseNumber(elem.step);
    let value = parseNumber(elem.$input.value) - step;
    let min = elem.min;
    if (value <= min) {
        value = min;
    }
    elem.$input.value = value;
    elem.value = elem.$input.value;
    emitChange(elem);
}

/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class NumInput extends Base {
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
        return ['value', 'unit'];
    }

    constructor() {
        super();
        this.shadowRoot.innerHTML = createDomContent();
        this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');
        this.oldValue = this.value;
        this.$input.value = this.getAttribute('value') || 0;
        this.$input.disabled = this.getAttribute('disabled') !== null;
        this.$input.readOnly = this.getAttribute('readonly') !== null;
        this.changeFlag = false;
        this._mouseEventHandles = null;//存储鼠标事件函数
        this._keyboardEventHandle = null;//存储键盘事件函数
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
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        controlKeyboardEvent(this, true);
        instanceArray.splice(index, 1);
    }

    attributeChangedCallback(attr, o, n) {
        switch (attr) {
            case 'value':
                let value = parseNumber(n);
                if (value != n) {
                    this.setAttribute('value', value);
                } else {
                    this.$input.value = value;
                }
                break;
            case 'unit':
                this.$unit.innerHTML = n || '';
        }
    }

    get value() {
        let value = parseNumber(this.$input.value);
        let unit = this.getAttribute('unit');
        if (unit !== null) {
            value += unit;
        }
        return value;
    }

    set value(val) {
        val = parseNumber(val);
        this.$input.value = val;
        let unit = this.getAttribute('unit');
        if (unit !== null) {
            val += unit;
        }
        this.setAttribute('value', val);
        this.$input.setAttribute('value', val);

    }

    get readOnly() {
        return this.$input.readOnly;
    }

    set readOnly(val) {
        this.$input.readOnly = !!val;
    }

    set disabled(val) {
        this.$input.disabled = !!val;
    }

    get disabled() {
        return this.$input.disabled;
    }
    get step() {
        let step = this.getAttribute('step');
        return step !== null ? parseNumber(step) : 1;
    }

    set step(val) {
        this.setAttribute('step', val);
    }

    get unit() {
        return this.getAttribute('unit');
    }

    set unit(val) {
        this.setAttribute('unit', val);
    }

    get max() {
        let max = this.getAttribute('max');
        if (max === null) {
            return Infinity;
        }
        return parseNumber(max);
    }

    set max(val) {
        this.setAttribute('max', parseNumber(val));
    }

    get min() {
        let min = this.getAttribute('min');
        if (min === null) {
            return -Infinity;
        }
        return parseNumber(min);
    }

    set min(val) {
        this.setAttribute('min', parseNumber(val));
    }
}

module.exports = NumInput;
