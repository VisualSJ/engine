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
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (instance, detach = false) {
    let _timer = null;
    const onKeyDown = event => {
        switch (event.keyCode) {
            case 13:
                instance.value = instance.$input.value;
                instance.confirm();
                break;
            case 27:
                instance.$input.value = parseNumber(instance.getAttribute('value'));
                break;
            case 38:
                clearTimeout(_timer);
                clearInterval(_timer);
                _timer = setTimeout(() => {
                    clearInterval(_timer);
                    _timer = setInterval(() => {
                        instance.increasing();
                    }, 50);
                }, 300);
                instance.increasing();
                break;
            case 40:
                clearTimeout(_timer);
                clearInterval(_timer);
                _timer = setTimeout(() => {
                    clearInterval(_timer);
                    _timer = setInterval(() => {
                        instance.diminishing();
                    }, 50);
                }, 300);
                instance.diminishing();
                break;
        }
    };
    const onKeyUp = event => {
        clearTimeout(_timer);
        clearInterval(_timer);
    };

    if (detach) {
        instance.removeEventListener('keydown', onKeyDown);
        instance.removeEventListener('keyup', onKeyUp);
    } else {
        instance.addEventListener('keydown', onKeyDown);
        instance.addEventListener('keyup', onKeyUp);
    }
};
/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {
    // 按住按钮需要持续增加或持续减少
    let _timer = null;
    const end = function () {
        clearTimeout(_timer);
        clearInterval(_timer);
        instance.$input.focus();
        document.removeEventListener('mouseup', end);
    };
    const plusOnMouseDown = () => {
        if (instance.readOnly || instance.disabled) {
            return;
        }
        _timer = setTimeout(() => {
            _timer = setInterval(() => {
                instance.increasing();
            }, 50);
        }, 300);
        instance.increasing();
        document.addEventListener('mouseup', end);
    };

    const minusOnMouseDown = () => {
        if (instance.readOnly || instance.disabled) {
            return;
        }
        _timer = setTimeout(() => {
            _timer = setInterval(() => {
                instance.diminishing();
            }, 50);
        }, 300);
        instance.diminishing();
        document.addEventListener('mouseup', end);
    };

    const onFocus = () => {
        instance.$input.focus();
    };

    const onBlur = () => {
        let value = instance.$input.value;
        let min = instance.min;
        let max = instance.max;
        if (value > max) {
            value = max;
        } else if (value < min) {
            value = min;
        }
        instance.value = value;
    };

    if (detach) {
        instance.removeEventListener('focus', onFocus);
        instance.removeEventListener('blur', onBlur);
        instance.$down.removeEventListener('mousedown', minusOnMouseDown, false);
        instance.$up.removeEventListener('mousedown', plusOnMouseDown, false);
    } else {
        instance.addEventListener('focus', onFocus);
        instance.addEventListener('blur', onBlur);
        instance.$down.addEventListener('mousedown', minusOnMouseDown, false);
        instance.$up.addEventListener('mousedown', plusOnMouseDown, false);
    }
};
/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class NumInput extends Base {
    static importStyle (src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(instance => {
                const el = instance.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    static get observedAttributes () {
        return ['value', 'unit'];
    }

    constructor () {
        super();

        this.shadowRoot.innerHTML = createDomContent();
        this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');
        this.$input.value = 0;
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
        controlKeyboardEvent(this);
        controlMouseEvent(this);
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        controlKeyboardEvent(this, true);
        instanceArray.splice(index, 1);
    }

    attributeChangedCallback (attr, o, n) {
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

    get value () {
        let value = parseNumber(this.$input.value);
        let unit = this.getAttribute('unit');
        if (unit !== null) {
            value += unit;
        }
        return value;
    }

    set value (val) {
        val = parseNumber(val);

        this.$input.value = val;

        let unit = this.getAttribute('unit');
        if (unit !== null) {
            val += unit;
        }

        this.setAttribute('value', val);
    }

    get readOnly () {
        return this.$input.readOnly;
    }

    set readOnly (val) {
        this.$input.readOnly = !!val;
    }

    get step () {
        let step = this.getAttribute('step');
        return step !== null ? parseNumber(step) : 1;
    }

    set step (val) {
        this.setAttribute('step', val);
    }

    get unit () {
        return this.getAttribute('unit');
    }

    set unit (val) {
        this.setAttribute('unit', val);
    }

    get max () {
        let max = this.getAttribute('max');
        if (max === null) {
            return Infinity;
        }
        return parseNumber(max);
    }

    set max (val) {
        this.setAttribute('max', parseNumber(val));
    }

    get min () {
        let min = this.getAttribute('min');
        if (min === null) {
            return -Infinity;
        }
        return parseNumber(min);
    }

    set min (val) {
        this.setAttribute('min', parseNumber(val));
    }

    /**
     * 数据递增
     */
    increasing () {
        let step = parseNumber(this.step);
        let value = parseNumber(this.$input.value) + step;
        let max = this.max;
        if (value >= max) {
            value = max;
        }
        this.$input.value = value;
    }

    /**
     * 数据递减
     */
    diminishing () {
        let step = parseNumber(this.step);
        let value = parseNumber(this.$input.value) - step;
        let min = this.min;
        if (value <= min) {
            value = min;
        }
        this.$input.value = value;
    }
}

module.exports = NumInput;
