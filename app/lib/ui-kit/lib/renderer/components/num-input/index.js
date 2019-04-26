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
const { mathUtils } = require('../../utils');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './num-input.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './num-input.html'), 'utf8')}`;

const instanceArray = [];
let customStyle = '';

/**
 * Attribute
 *
 *   disabled: 禁用组件，显示灰色，无法输入，无法选中
 *   readonly: 可以选中，无法输入
 *   invalid: 无效数据
 *
 *   value: 当前的文本值
 *   unit: 显示的单位
 *   preci: 保留小数点位数
 *   step: 步进数据
 *   max: 最大值
 *   min: 最小值
 */

class NumInput extends Base {

    /**
     * 使用第三方提供的样式显示当前的元素
     * @param {file} src
     */
    static importStyle(src) {
        if (!fs.existsSync(src)) {
            return;
        }

        // 读取 css 并设置到节点内
        customStyle = fs.readFileSync(src, 'utf8');

        // 循环已经使用的节点,设置新的 css
        instanceArray.map((elem) => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    /**
     * 动态传入 num-input 调节步长
     * @param {*} step
     */
    static updateStep(step) {
        instanceArray.map((elem) => {
            elem.step = step;
        });
    }

    static get observedAttributes() {
        return [
            'disabled',
            'readonly',
            'invalid',

            'value',
            'unit',
            'preci',
            'step',
            'max',
            'min',
        ];
    }

    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'disabled':
                this.$input.disabled = newData !== null;
                break;
            case 'readonly':
                this.$input.readonly = newData !== null;
                break;
            case 'invalid':
                if (newData !== null) {
                    this.$input.value = '-';
                } else {
                    this.$input.value = this.value;
                }
                break;

            case 'value':
                // 无效状态在被修改后应该重置
                if (this.invalid) {
                    this.invalid = false;
                }

                // 如果焦点在 input 上，则不设置 value 的值
                if (this._staging) {
                    return;
                }

                // TODO hack 允许输入 -
                if (newData === '-') {
                    this.$input.value = '-';
                    return;
                }

                let value = parseFloat(newData);
                if (isNaN(value)) {
                    value = 0;
                }

                if (typeof this.preci === 'number') {
                    value = value.toFixed(this.preci);
                }

                if (typeof this.max === 'number') {
                    value = Math.min(this.max, value);
                }

                if (typeof this.min === 'number') {
                    value = Math.max(this.min, value);
                }

                this.$input.value = value;
                break;
            case 'unit':
                this.$unit.innerHTML = newData || '';
                break;
            case 'preci':
                // this.preci = newData;
                break;
            case 'step':
                // 未设置 preci 时，可直接赋值
                if (this.preci == null) {
                    break;
                }
                // 计算小数点位数
                let rang = mathUtils.comPreci(newData);
                // 小数点位数大于设置的精度值，则警告
                if (rang > this.preci) {
                    console.warn('The accuracy of step needs to be consistent with preci');
                }
                break;
            case 'max':
                // this.max = newData;
                const newVal = mathUtils.clamp(this.value, this.min, this.max);
                this.$input.value = parseFloat(newVal);
                break;
            case 'min':
                // this.min = newData;
                const newVal2 = mathUtils.clamp(this.value, this.min, this.max);
                this.$input.value = parseFloat(newVal2);
                break;
        }
    }

    ////////////////////////////

    // disabled
    // readonly
    // invalid

    get value() {
        return this.getAttribute('value') || '';
    }
    set value(val) {
        val -= 0;
        this.setAttribute('value', val);
    }

    get unit() {
        return this.getAttribute('unit') || '';
    }
    set unit(val) {
        val += '';
        this.setAttribute('unit', val);
    }

    get preci() {
        return this.getAttribute('preci') || null;
    }
    set preci(val) {
        val -= 0;
        this.setAttribute('preci', val);
    }

    get step() {
        return this.getAttribute('step') || 1;
    }
    set step(val) {
        val -= 0;
        this.setAttribute('step', val);
    }

    get max() {
        return this.getAttribute('max') || null;
    }
    set max(val) {
        val -= 0;
        this.setAttribute('max', val);
    }

    get min() {
        return this.getAttribute('min') || null;
    }
    set min(val) {
        val -= 0;
        this.setAttribute('min', val);
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        // 指定会影响 tab 焦点的内部元素
        this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');
        this.$input.$root = this.$up.$root = this.$down.$root = this;

        // 记录缓存的 value 值，用户 esc 还原数据
        this._staging = null;

        // 绑定事件
        this.$input.addEventListener('focus', this._onInputFocus);
        this.$input.addEventListener('blur', this._onInputBlur);
        this.$input.addEventListener('input', this._onInputChange);
        
        // 内部增加减少按钮的事件绑定
        this.$up.addEventListener('mousedown', this._onUpMouseDown);
        this.$down.addEventListener('mousedown', this._onDownMouseDown);
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存节点
        instanceArray.push(this);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
        mouseUpControl(this);
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 删除之前缓存的数据
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
        mouseUpControl(this, true);
    }

    //////////////////////
    // 私有事件

    /**
     * 获得了焦点
     */
    _onFocus(event) {
        super._onFocus(event);
        // 只读或者禁用状态，不需要处理
        if (this.disabled || this.readonly) {
            return;
        }
        // 判断是否已按下shift键
        if (this._shiftFlag) {
            return;
        }
        this.$input.focus();
    }

    /**
     * input 获得了焦点
     */
    _onInputFocus() {
        // 只读或者禁用状态，不需要处理
        if (this.disabled) {
            return;
        }
        if (this.readonly) {
            this.$root.focus();
            return;
        }

        // 暂存数据
        this.$root._staging = this.value;

        // 全选所有的文本
        this.select();

    }

    /**
     * input 丢失焦点
     */
    _onInputBlur() {
        if (this.$root._staging !== this.value) {
            this.$root._confirm();
        }
        // 取消缓存的数据
        this.$root._staging = null;
    }

    /**
     * input 数据修改
     */
    _onInputChange() {
        // 更新当前组件上的 value
        this.$root.value = this.value;

        // 发送 change 事件
        this.$root.dispatch('change');
    }

    /**
     * input 键盘按下事件
     */
    _onKeyDown(event) {
        // 判断是否为可读或禁用
        if (this.disabled || this.readonly) {
            return;
        }

        switch (event.keyCode) {
            case 13: // 回车
                this._confirm();
                break;
            case 27: // esc
                this._cancel();
                break;
            case 38: // up
                event.preventDefault();
                this.stepUp();
                break;
            case 40: // down
                event.preventDefault();
                this.stepDown();
                break;
        }
    }

    //////////////////////////

    _confirm() {
        const inputFocused = this._staging !== null;

        // 如果数据修改，则发送 confirm 事件
        if (this._staging !== null && this._staging !== this.value) {
            this._staging = this.value;
            this.dispatch('change');
            this.dispatch('confirm');
        }

        if (inputFocused) {
            this.focus();
        } else {
            this.$input.focus();
        }
    }

    _cancel() {
        const inputFocused = this._staging !== null;

        // 如果缓存数据存在，这时候退出，则还原缓存数据
        if (this._staging !== null && this._staging !== this.value) {
            this.$input.value = this._staging;
            this.dispatch('change');
            this.dispatch('cancel');
        }

        if (inputFocused) {
            this.focus();
        }
    }

    /////////////////////////////////////////
    // 公有事件 外部可使用的接口 stepUp、stepDown

    /**
     * 根据step递增数据
     * @param {*} step
     */
    stepUp(step) {
        //判断是否为可读或禁用
        if (this.disabled || this.readonly) {
            return;
        }

        if (this._staging === null) {
            this.$input.focus();
        }

        if (this.invalid) {
            this.$input.value = this.value;
        }

        // this.focused = true;
        const inscrease = step || this.step;
        let value = mathUtils.accAdd(this.$input.value, inscrease);
        if (this.max !== null && value > this.max) {
            if (this._timer) {
                // 清除定时器
                clearTimeout(this._timer);
                clearInterval(this._timer);
            }
            return;
        }
        this.$input.value = value;
        this.setAttribute('value', this.$input.value);
        this.dispatch('change');
    }

    /**
     * 根据 默认或者指定的 step 来递增递减值
     * @param {*} step 注意：这相当于一个减法函数，传入 5 是减 5，传入 -5 是加上 5
     */
    stepDown(step) {
        //判断是否为可读或禁用
        if (this.disabled || this.readonly) {
            return;
        }

        if (this._staging === null) {
            this.$input.focus();
        }

        if (this.invalid) {
            this.$input.value = this.value;
        }

        const decrease = step || this.step;
        let value = mathUtils.accSub(this.$input.value, decrease);
        if (this.min !== null && value < this.min) {
            if (this._timer) {
                // 清除定时器
                clearTimeout(this._timer);
                clearInterval(this._timer);
            }
            return;
        }
        this.$input.value = value;
        this.setAttribute('value', this.$input.value);
        this.dispatch('change');
    }

    /**
     * up 按键点击事件
     */
    _onUpMouseDown(event) {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readonly) {
            return;
        }
        event.stopPropagation();
        this.setAttribute('pressed', '');

        clearTimeout(this.$root._timer);
        clearInterval(this.$root._timer);
        // 初次 300 ms 延迟，以免点击时无法单步递增
        this.$root._timer = setTimeout(() => {
            this.$root._timer = setInterval(() => {
                this.$root.stepUp();
            }, 50);
        }, 300);
        this.$root.stepUp();
    }

    /**
     * down 按键点击事件
     */
    _onDownMouseDown(event) {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readonly) {
            return;
        }
        event.stopPropagation();
        this.setAttribute('pressed', '');

        clearTimeout(this.$root._timer);
        clearInterval(this.$root._timer);
        // 初次 300 ms 延迟，以免点击时无法单步递增
        this.$root._timer = setTimeout(() => {
            this.$root._timer = setInterval(() => {
                this.$root.stepDown();
            }, 50);
        }, 300);
        this.$root.stepDown();
    }

    // _onKeyUp
}

/**
 * 鼠标抬起事件，控制停止增加或减少的定时器函数
 * @param {Element} elem
 * @param {Boolean} detach
 */
const mouseUpControl = (elem, detach = false) => {
    elem.onMouseUp = (function(elem) {
        const onMouseUp = (event) => {
            if (!elem._timer) {
                return;
            }
            elem.$up.removeAttribute('pressed');
            elem.$down.removeAttribute('pressed');
            clearTimeout(elem._timer);
            clearInterval(elem._timer);
            elem.dispatch('confirm');
            // elem._staging = parseFloat(elem.$input.value, 10);
            delete elem._timer;
        };
        return onMouseUp;
    })(elem);
    if (detach) {
        document.removeEventListener('mouseup', elem.onMouseUp);
    } else {
        document.addEventListener('mouseup', elem.onMouseUp);
    }
};

module.exports = NumInput;
