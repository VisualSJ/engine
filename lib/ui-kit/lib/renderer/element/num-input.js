'use strict';

//////////////
// 27 esc 恢复上一次记录的数据
// 32 space 无特殊响应
// 13 enter 记录数据并触发 confirm
// 38 up / 40 down: 加减 step 数据
// 37 left / 39 right: 无特殊响应

const fs = require('fs');
const ps = require('path');

const Base = require('./base');

const HTML = `
<style>
${fs.readFileSync(ps.join(__dirname, '../style/num-input.css'))}
</style>
${fs.readFileSync(ps.join(__dirname, '../template/num-input.html'))}
`;

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
 * 绑定焦点事件
 * @param {*} elem 
 */
let bindFocusEvent = function (elem) {
    elem.addEventListener('focus', () => {
        elem.$input.focus();
    });

    elem.addEventListener('blur', () => {
        let value = elem.$input.value;
        let min = elem.min;
        let max = elem.max;
        if (value > max) {
            value = max;
        } else if (value < min) {
            value = min;
        }
        elem.value = value;
    });
};

/**
 * 绑定键盘事件
 * @param {*} elem 
 */
let bindKeyboardEvent = function (elem) {
    let _timer = null;
    elem.addEventListener('keydown', (event) => {
        switch (event.keyCode) {
            case 13:
                elem.value = elem.$input.value;
                elem.confirm();
                break;
            case 27:
                elem.$input.value = parseNumber(elem.getAttribute('value'));
                break;
            case 38:
                clearTimeout(_timer);
                clearInterval(_timer);
                _timer = setTimeout(() => {
                    clearInterval(_timer);
                    _timer = setInterval(() => {
                        elem.increasing();
                    }, 50);
                }, 300);
                elem.increasing();
                break;
            case 40:
                clearTimeout(_timer);
                clearInterval(_timer);
                _timer = setTimeout(() => {
                    clearInterval(_timer);
                    _timer = setInterval(() => {
                        elem.diminishing();
                    }, 50);
                }, 300);
                elem.diminishing();
                break;
        }
    });

    elem.addEventListener('keyup', () => {
        clearTimeout(_timer);
        clearInterval(_timer);
    });
};

/**
 * 绑定鼠标事件
 * @param {*} elem 
 */
let bindMouseEvent = function (elem) {
    // 按住按钮需要持续增加或持续减少
    let _timer = null;
    let end = function () {
        clearTimeout(_timer);
        clearInterval(_timer);
        elem.$input.focus();
        document.removeEventListener('mouseup', end);
    };

    // 鼠标按下 up 按钮
    elem.$up.addEventListener('mousedown', () => {
        if (elem.readOnly || elem.disabled) {
            return;
        }
        _timer = setTimeout(() => {
            _timer = setInterval(() => {
                elem.increasing();
            }, 50);
        }, 300);
        elem.increasing();
        document.addEventListener('mouseup', end);
    });

    // 鼠标按下 down 按钮
    elem.$down.addEventListener('mousedown', () => {
        if (elem.readOnly || elem.disabled) {
            return;
        }
        _timer = setTimeout(() => {
            _timer = setInterval(() => {
                elem.diminishing();
            }, 50);
        }, 300);
        elem.diminishing();
        document.addEventListener('mouseup', end);
    });
};

class NumInput extends Base {

    constructor () {
        super();

        this.shadowRoot.innerHTML = HTML;
        this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');

        bindFocusEvent(this);
        bindKeyboardEvent(this);
        bindMouseEvent(this);

        this.$input.value = 0;
    }

    static get observedAttributes () {
        return ['value', 'unit'];
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