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

    ////////////////////////////////////////////////////

    get value() {
        let val = parseFloat(this.getAttribute('value'));
        if (isNaN(val)) {
            return 0;
        }
        if (!(this.preci == null)) {
            let rang = mathUtils.comPreci(val);
            if (rang > this.preci) {
                val = val.toFixed(this.preci);
            }
        }
        return mathUtils.clamp(val, this.min, this.max);
    }

    set value(val) {
        if (isNaN(parseFloat(val)) && val !== '-') {
            console.warn('Please enter a valid number');
        }
        this.setAttribute('value', val);
    }

    get step() {
        const value = parseFloat(this.getAttribute('step'));
        return isNaN(value) ? 1 : value;
    }

    set step(val) {
        let value = isNaN(val) ? 1 : val;
        this.$input.step = value;
        this.setAttribute('step', value);
    }

    get unit() {
        return this.getAttribute('unit');
    }

    set unit(val) {
        this.setAttribute('unit', val);
    }

    get max() {
        let max = this.$input.max;
        if (max === '') {
            max = Infinity;
        }
        return max;
    }

    set max(val) {
        let value = isNaN(val) ? Infinity : val;
        this.$input.max = value;
        if (this.$input.max !== value) {
            this.setAttribute('max', value);
        }
    }

    get min() {
        let min = this.$input.min;
        if (min === '') {
            min = -Infinity;
        }
        return min;
    }

    set min(val) {
        let value = isNaN(val) ? -Infinity : val;
        this.$input.min = value;
        if (this.$input.min !== value) {
            this.setAttribute('min', value);
        }
    }

    set preci(val) {
        // 输入的位数为非数字或者是负数
        if (isNaN(val) || !(val >= 0) || val > 20) {
            console.warn('preci only allows numbers between 0 and 20!');
            this.setAttribute('preci', 20);
            return;
        }
    }

    get preci() {
        return parseInt(this.getAttribute('preci'), 10) || 20;
    }

    // get set focused
    // get set disabled
    // get _shiftFlag

    static get observedAttributes() {
        return [
            'value',
            'unit',
            'preci',
            'step',
            'disabled',
            'readonly',
            'max',
            'min',
        ];
    }

    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'value':
                if (newData === undefined || newData === null) {
                    // 新值为 undefined 或 null 则不作处理
                    return;
                }

                if (newData === '-') {
                    this.$input.value = '-';
                }
                let value;
                // 存在 preci 控制小数点位数
                if (!(this.preci == null)) {
                    let rang = mathUtils.comPreci(this.value);
                    if (rang > this.preci) {
                        value = parseFloat(newData).toFixed(this.preci);
                    } else {
                        value = parseFloat(newData);
                    }
                }

                // 小数点精度控制后和原来的一致，直接给 input 赋值
                if (value.toString() === newData.toString()) {
                    newData = mathUtils.clamp(newData, this.min, this.max);
                    this.$input.value = parseFloat(newData);
                }
                break;
            case 'unit':
                this.$unit.innerHTML = newData || '';
                break;
            case 'preci':
                this.preci = parseInt(newData, 10);
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
            case 'disabled':
                this.$input.disabled = newData !== null;
                break;
            case 'readonly':
                this.$input.readOnly = newData !== null;
                break;
            case 'max':
                this.max = newData;
                const newVal = mathUtils.clamp(this.value, this.min, this.max);
                this.$input.value = parseFloat(newVal);
                break;
            case 'min':
                this.min = newData;
                const newVal2 = mathUtils.clamp(this.value, this.min, this.max);
                this.$input.value = parseFloat(newVal2);
                break;
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        // 指定会影响 tab 焦点的内部元素
        this.$child = this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');
        this.$child = this.$input;
        this.$input.$root = this.$up.$root = this.$down.$root = this;

        // 记录缓存的 value 值
        this._staging = null;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存节点
        instanceArray.push(this);

        // 初始化 attribute
        let attrs = ['readonly', 'step', 'max', 'min', 'disabled', 'value'];
        attrs.forEach((name) => {
            let value = this.getAttribute(name);
            if (value === null) {
                return;
            }
            if (name === 'value') {
                if (this.preci !== null) {
                    let rang = mathUtils.comPreci(value);
                    if (rang > this.preci) {
                        value = parseFloat(value).toFixed(this.preci);
                        this.setAttribute('value', value);
                    }
                }
            }
            this.$input.setAttribute(name, value);
        });

        // 默认值
        if (this.$input.value === '') {
            this.$input.value = 0;
        }

        // 给内部 input 绑定事件
        this.$input.addEventListener('mousewheel', this._onMousewheel);
        this.$input.addEventListener('focus', this._onInputFocus);
        this.$input.addEventListener('input', this._onInputChange);
        this.$input.addEventListener('blur', this._onInputBlur);

        // 内部增加减少按钮的事件绑定
        this.$up.addEventListener('mousedown', this._onUpMouseDown);
        this.$down.addEventListener('mousedown', this._onDownMouseDown);
        mouseUpControl(this);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 删除之前缓存的数据
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        this.$input.removeEventListener('mousewheel', this._onMousewheel);
        this.$input.removeEventListener('focus', this._onInputFocus);
        this.$input.removeEventListener('input', this._onInputChange);

        this.$up.removeEventListener('mousedown', this._onUpMouseDown);
        this.$down.removeEventListener('mousedown', this._onDownMouseDown);
        mouseUpControl(this, true);
    }

    // get set focused
    // get set disabled
    // get _shiftFlag

    // 公有事件 外部可使用的接口 stepUp、stepDown

    /**
     * 根据step递增数据
     * @param {*} step
     */
    stepUp(step) {
        this.focused = true;
        const inscrease = step || this.step;
        let value = mathUtils.accAdd(this.$input.value, inscrease);
        if (value > this.max) {
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
        this.focused = true;
        const decrease = step || this.step;
        let value = mathUtils.accSub(this.$input.value, decrease);
        if (value < this.min) {
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

    //////////////////////
    // 私有事件

    /**
     * 键盘点击事件
     * @param {Event} event
     */
    _onKeyDown(event) {
        super._onKeyDown(event);

        const inputFocused = this._staging !== null;

        switch (event.keyCode) {
            ////////////////
            // 上下箭头使用 Input 的原生事件
            case 13: // enter
                // 值发生变化
                if (this._staging !== null && this._staging !== parseFloat(this.getAttribute('value'))) {
                    // confirm之前需要更改暂存数据值
                    this._staging = parseFloat(this.getAttribute('value') || 0);
                    this.$input.value = this._staging;
                    delete this._staging;
                    this.dispatch('confirm');
                }

                if (inputFocused) {
                    this.focus();
                } else {
                    this.$input.focus();
                }
                break;
            case 27: // esc
                // 清除定时器
                clearTimeout(this._timer);
                clearInterval(this._timer);

                // 如果 staging 不存在，或者数据相等
                if (this._staging !== null && this._staging !== this.value) {
                    // 清除数据
                    this.value = this._staging;
                    this._staging = null;

                    this.dispatch('change');
                    this.dispatch('cancel');
                }

                this.focus();
                break;
            case 38: // up
                this.stepUp();
                event.preventDefault();
                break;
            case 40: // down
                this.stepDown();
                event.preventDefault();
                break;
        }
    }

    /**
     * 滚轮事件,滚动滚轮控制值
     * @param {*} event
     */
    _onMousewheel(event) {
        //判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        //判断是否聚焦,防止 hover 时也会发生滚动控制值
        if (!this.$root.focused) {
            return;
        }
        event.preventDefault();
        // let value;
        if (event.wheelDelta > 0) {
            this.$root.stepUp();
        } else {
            this.$root.stepDown();
        }
    }

    /**
     * 获得了焦点
     * 需要将焦点转移到 input 元素上
     * @param {*} event
     */
    _onFocus(event) {
        super._onFocus(event);
        // 判断是否已按下 shift 键
        if (this._shiftFlag) {
            return;
        }
        this.$input.focus();
    }

    /**
     * blur 事件，,当值发生改变时,离开 input 则视为确认该值
     */
    _onBlur() {
        super._onBlur();
        // 判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        this.focused = false;
        if (this._staging === parseFloat(this.$input.value, 10) || !this.getAttribute('value')) {
            this.$input.value = this._staging;
            this.setAttribute('value', this._staging);
            return;
        }
        this._staging = parseFloat(this.$input.value);
        // confirm 之前需要设置一下 value 值为计算后的正确值
        this.$input.value = this.value;
        this.$input.setAttribute('value', this.$input.value);
        this.setAttribute('value', this.$input.value);
        this.dispatch('confirm');
    }

    /**
     * focus 事件,获取焦点时,存储此时的值
     * @param {Event} event
     */
    _onInputFocus(event) {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readOnly) {
            return;
        }
        this.$root._staging = parseFloat(this.value);
        this._inputStaging = parseFloat(this.value);
        this.select();
    }

    /**
     * 
     * @param {*} event 
     */
    _onInputBlur(event) {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readOnly) {
            return;
        }
        this.$root._staging = null;
        this._inputStaging = null;
    }

    /**
     * input 修改事件
     * 这里的触发机制是当且仅当输入的改变的值有效时才触发，也就是输入空格不触发 change ,若未输入值离开后将恢复原值
     * 需要将数据回流到 root 元素上
     */
    _onInputChange() {
        if (this.value === '' || !isFinite(this.value)) {
            return;
        }

        // 比较与上一次数据的变化
        if (parseFloat(this.value) === this._inputStaging) {
            return;
        }

        this._inputStaging = this.value;
        this.$root.value = this.value;

        // 事件通知要在值设置好之后
        this.$root.dispatch('change');
    }

    /**
     * up 按键点击事件
     */
    _onUpMouseDown(event) {
        event.stopPropagation();
        this.setAttribute('pressed', '');
        let that = this.$root;
        // 判断是否为可读或禁用
        if (that.disabled || that.readonly) {
            return;
        }
        clearTimeout(that._timer);
        clearInterval(that._timer);
        // 初次 300 ms 延迟，以免点击时无法单步递增
        that._timer = setTimeout(() => {
            that._timer = setInterval(() => {
                that.stepUp();
            }, 50);
        }, 300);
        that.stepUp();
    }

    /**
     * down 按键点击事件
     */
    _onDownMouseDown(event) {
        event.stopPropagation();
        this.setAttribute('pressed', '');
        let that = this.$root;
        // 判断是否为可读或禁用
        if (that.disabled || that.readonly) {
            return;
        }
        clearTimeout(that._timer);
        clearInterval(that._timer);
        // 初次 300 ms 延迟，以免点击时无法单步递增
        that._timer = setTimeout(() => {
            that._timer = setInterval(() => {
                that.stepDown();
            }, 50);
        }, 300);
        that.stepDown();
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
            elem._staging = parseFloat(elem.$input.value, 10);
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
