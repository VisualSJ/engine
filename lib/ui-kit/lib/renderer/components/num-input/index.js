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
        instanceArray.map(elem => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    ////////////////////////////////////////////////////

    get value() {
        let val = parseFloat(this.getAttribute('value'));
        if (isNaN(val)) {
            return 0;
        }
        if(!(this.preci == null)) {
            let rang = mathUtils.comPreci(val);
            if (rang > this.preci) {
                val = val.toFixed(this.preci);
            } 
        }
        return mathUtils.clamp(val, this.min, this.max);
    }

    set value(val) {
        if (isNaN(parseFloat(val))) {
            console.warn('Please enter a valid number');
            this.$input.value = 0;
        }
        this.setAttribute('value', val);
    }

    get readOnly() {
        return !!this.$input.readOnly;
    }

    set readOnly(val) {
        this.$input.readOnly = val;
        this.setAttribute(this.$input.getAttribute('readonly'));
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
        this.setAttribute('max', value);
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
        this.setAttribute('min', value);
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
        return parseInt(this.getAttribute('preci')) || 20;
    }

    // get set focused
    // get set disabled
    // get _shiftFlag

    static get observedAttributes() {
        return [
            'value',
            'unit',
            'preci',
            'step'
        ];
    }

    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'value':
                let value ;
                // 存在 preci 控制小数点位数
                if(!(this.preci == null)) {
                    let rang = mathUtils.comPreci(value);
                    if (rang > this.preci) {
                        value = parseFloat(newData).toFixed(this.preci);
                    } else {
                        value = parseFloat(newData);
                    }
                }
                // 小数点精度控制后和原来的一致，直接给input赋值
                if (value.toString() === newData.toString()) {
                    newData = mathUtils.clamp(newData, this.min, this.max);
                    this.$input.value = parseFloat(newData);
                }
                break;
            case 'unit':
                this.$unit.innerHTML = newData || '';
                break;
            case 'preci':
                this.preci = parseInt(newData);
                break; 
            case 'step':
                // 未设置preci时，可直接赋值
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
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        // 指定会影响tab焦点的内部元素
        this.$child = this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');
        this.$child = this.$input;
        this.$input.$root = this.$up.$root = this.$down.$root = this;
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
                if(!(this.preci == null)) {
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

        // 给内部input绑定事件
        this.$input.addEventListener('mousewheel', this._onMousewheel);
        this.$input.addEventListener('focus', this._onInputFocus);
        this.$input.addEventListener('input', this._onInputChange);

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

    //////////////////////
    // 私有事件

    /**
     * 键盘点击事件
     * @param {Event} event 
     */
    _onKeyDown(event) {
        super._onKeyDown(event);
        switch (event.keyCode) {
            ////////////////
            // 上下箭头使用Input的原生事件
            case 13: // enter
                // 值未发生变化
                if (this._staging === parseFloat(this.getAttribute('value'))) {
                    // 当值与原值相等时,需要判断是否是由于只输入负号而导致的数据未更新
                    break;
                }
                // confirm之前需要更改暂存数据值
                this._staging = parseFloat(this.getAttribute('value') || 0);
                this.$input.value = this._staging;
                this.dispatch('confirm');
                break;
            case 27: // esc
                // 清除定时器
                clearTimeout(this._timer);
                clearInterval(this._timer);
                if (this._staging === this.value) {
                    return;
                }
                this.value = this._staging;
                this.setAttribute('value', this.value);
                this.dispatch('change');
                this.dispatch('cancel');
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
        //判断是否聚焦,防止hover时也会发生滚动控制值
        if (!this.$root.focused) {
            return;
        }
        event.preventDefault();
        let value;
        if (event.wheelDelta > 0) {
           value = mathUtils.accAdd(this.$root.$input.value, this.$root.step);
            if (value > this.$root.max) {
                return;
            }
        } else {
            value = mathUtils.accSub(this.$root.$input.value, this.$root.step);
            if (value < this.$root.min) {
                return;
            }
        }
        this.$root.setAttribute('value', value);
        this.$root.$input.setAttribute('value', value);
        this.$root.dispatch('change');
    }

    /**
    * 获得了焦点
    * 需要将焦点转移到 input 元素上
    * @param {*} event 
    */
    _onFocus(event) {
        super._onFocus(event);
        // 判断是否已按下shift键
        if (this._shiftFlag) {
            return;
        }
        this.$input.focus();
    }

    /**
     * blur事件，,当值发生改变时,离开input则视为确认该值
     */
    _onBlur() {
        super._onBlur();
        // 判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        this.focused = false;
        // 清除定时器
        clearTimeout(this._timer);
        clearInterval(this._timer);
        if(this._staging === parseFloat(this.$input.value) || !this.getAttribute('value') || this.getAttribute('value') === '') {
            this.$input.value = this._staging;
            this.setAttribute('value', this._staging);
            this.$input._inputStaging = this.$input.value;
            return;
        }
        this._staging = parseFloat(this.$input.value);
        // confirm之前需要设置一下value值为计算后的正确值
        this.$input.value = this.value;
        this.$input.setAttribute('value', this.$input.value);
        this.setAttribute('value', this.$input.value);
        this.dispatch('confirm');
    }

    /**
     * focus事件,获取焦点时,存储此时的值
     * @param {Event} event 
     */
    _onInputFocus(event) {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readOnly) {
            return;
        }
        this.$root._staging = parseFloat(this.value);
        this._inputStaging = parseFloat(this.value);
    }

    /**
     * input 修改事件(这里的触发机制是当且仅当输入的改变的值有效时才触发，也就是输入空格不触发change,若未输入值离开后将恢复原值)
     * 需要将数据回流到 root 元素上
     */
    _onInputChange() {
        // 当获取到的value为空时,即用户输入非数字字符，需要获取到当前值判断是否是负号
        if (this.value === '') {
            return;
        }
        // 比较与上一次数据的变化
        if ( parseFloat(this.value) === this._inputStaging) {
            return;
        }
        this._inputStaging = this.value;
        this.$root.value = this.value;
        // 事件通知要在值设置好之后
        this.$root.dispatch('change');
    }

    /**
     * up 按键点击事件,调用input原生的增加数据接口
     */
    _onUpMouseDown(event) {
        let that = this.$root;
        // 判断是否为可读或禁用
        if (that.disabled || that.readOnly) {
            return;
        }
        clearTimeout(that._timer);
        clearInterval(that._timer);
        that._timer = setTimeout(() => {
            that._timer = setInterval(() => {
                let value = mathUtils.accAdd(that.$input.value, that.step);
                if (value > that.max) {
                    clearTimeout(that._timer);
                    clearInterval(that._timer);
                    return;
                }
                that.$input.value = value;
                that.dispatch('change');
                that.setAttribute('value', that.$input.value);
            }, 50);
        }, 300);

        that.focused = true;
        let value = mathUtils.accAdd(that.$input.value, that.step);
        if (value > that.max) {
            return;
        }
        that.$input.value = value;
        that.setAttribute('value', that.$input.value);
        that.dispatch('change');
    }

    /**
     * down 按键点击事件,调用input原生的减少数据接口
     */
    _onDownMouseDown(event) {
        let that = this.$root;
        // 判断是否为可读或禁用
        if (that.disabled || that.readOnly) {
            return;
        }        
        clearTimeout(that._timer);
        clearInterval(that._timer);
        that._timer = setTimeout(() => {
            that._timer = setInterval(() => {
                let value = mathUtils.accSub(that.$input.value, that.step);
                if (value < that.min) {
                    clearTimeout(that._timer);
                    clearInterval(that._timer);
                    return;
                }
                that.$input.value = value;
                that.setAttribute('value', that.$input.value);
                that.dispatch('change');
            }, 50);
        }, 300);

        that.focused = true;
        let value = mathUtils.accSub(that.$input.value, that.step);
        if (value < that.min) {
            return;
        }
        that.$input.value = value;
        that.setAttribute('value', that.$input.value);
        that.dispatch('change');
    }

    // _onKeyDown   
    // _onKeyUp
}

/**
 * 鼠标抬起事件，控制停止增加或减少的定时器函数
 * @param {Element} elem 
 * @param {Boolean} detach 
 */
const mouseUpControl = (elem, detach = false) => {
    elem._onMouseUp = (function (elem) {
        const _onMouseUp = (event) => {
            clearTimeout(elem._timer);
            clearInterval(elem._timer);
        }
        return _onMouseUp;
    })(elem)
    if (detach) {
        document.removeEventListener('mouseup', elem._onMouseUp);
    } else {
        document.addEventListener('mouseup', elem._onMouseUp);
    }
}

module.exports = NumInput;