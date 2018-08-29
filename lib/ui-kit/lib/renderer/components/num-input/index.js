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

    ////////////////////////////

    get value() {
        return parseFloat(this.$input.value || 0);
    }

    set value(val) {
        this.$input.value = val;
    }

    get readOnly() {
        return !!this.$input.readOnly;
    }

    set readOnly(val) {
        this.$input.readOnly = val;
        this.setAttribute(this.$input.getAttribute('readonly'));
    }

    get step() {
        // return parseFloat(this.$input.step !== '' ? this.$input.step : 1);
        return this.getAttribute('step');
    }

    set step(val) {
        // this.$input.step = val;
        // this.setAttribute(this.$input.getAttribute('step'));
        this.setAttribute('step', val);
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
        this.$input.max = val;
        this.setAttribute(this.$input.getAttribute('max'));
    }

    get min() {
        let min = this.$input.max;
        if (min === '') {
            min = -Infinity;
        }
        return min;
    }

    set min(val) {
        this.$input.min = val;
        this.setAttribute(this.$input.getAttribute('min'));
    }

    static get observedAttributes() {
        return [
            'value',
            'unit',
        ];
    }

    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'value':
                this.$input.value = parseFloat(newData);
                break;
            case 'unit':
                this.$unit.innerHTML = newData || '';
                break;
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$input = this.shadowRoot.querySelector('input');
        this.$up = this.shadowRoot.querySelector('.up');
        this.$down = this.shadowRoot.querySelector('.down');
        this.$unit = this.shadowRoot.querySelector('.unit span');

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
        let attrs = ['readonly', 'step', 'max', 'min', 'disabled'];
        attrs.forEach((name) => {
            let value = this.getAttribute(name);
            if (value === null) {
                return;
            }
            this.$input.setAttribute(name, value);
        });

        // 默认值
        if (this.$input.value === '') {
            this.$input.value = 0;
        }

        // 绑定基础事件
        this.addEventListener('keydown', this._onKeyDown);
        this.addEventListener('focus', this._onFocus);
        this.addEventListener('blur', this._onBlur);

        // 给内部input绑定事件
        this.$input.addEventListener('mousewheel', this._onMousewheel);
        this.$input.addEventListener('focus', this._onInputFocus);
        this.$input.addEventListener('input', this._onInputChange);

        // 内部增加减少按钮的事件绑定
        this.$up.addEventListener('mousedown', this._onUpMouseDown);
        this.$down.addEventListener('mousedown', this._onDownMouseDown);
        this.$up.addEventListener('mouseup', this._onMouseUp);
        this.$down.addEventListener('mouseup', this._onMouseUp);

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

        // 取消事件绑定
        this.removeEventListener('keydown', this._onKeyDown);
        this.removeEventListener('focus', this._onFocus);
        this.removeEventListener('blur', this._onBlur);

        this.$input.removeEventListener('mousewheel', this._onMousewheel);
        this.$input.removeEventListener('focus', this._onInputFocus);
        this.$input.removeEventListener('input', this._onInputChange);

        document.removeEventListener('mousedown', this._onUpMouseDown);
        document.removeEventListener('mousedown', this._onDownMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('mouseup', this._onMouseUp);
    }

    // get set focused
    // get set disabled

    //////////////////////
    // 私有事件

    /**
     * 键盘点击事件
     * @param {Event} event 
     */
    _onKeyDown(event) {
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
                this.dispatch('confirm');
                break;
            case 27: // esc
                if (this._staging === this.value) {
                    return;
                }
                this.value = this._staging;
                this.setAttribute('value', this.value);
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
        if (event.wheelDelta > 0) {
            this.stepUp();
        } else {
            this.stepDown();
        }
        this.$root.dispatch('change');
    }

    /**
    * 获得了焦点
    * 需要将焦点转移到 input 元素上
    * @param {*} event 
    */
    _onFocus(event) {
        super._onFocus(event);
        this.$input.focus();
    }

    /**
     * num-input的blur事件，,当值发生改变时,离开input则视为确认该值
     */
    _onBlur() {
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
    }

    /**
     * input 修改事件(这里的触发机制是当且仅当输入的改变的值有效是菜触发，也就是输入空格不触发change,若未输入值离开后将恢复原值)
     * 需要将数据回流到 root 元素上
     */
    _onInputChange() {
        // 当获取到的value为空时,即用户输入非数字字符，需要获取到当前值判断是否是负号
        if (this.value === '') {
            return;
        }
        // 比较与上一次数据的变化
        if (this.value === this._inputStaging) {
            return;
        }
        this._inputStaging = this.value;
        this.$root.dispatch('change');
        this.$root.setAttribute('value', this.value);
    }

    /**
     * up 按键点击事件,调用input原生的增加数据接口
     */
    _onUpMouseDown() {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readOnly) {
            return;
        }
        clearTimeout(this.$root._timer);
        clearInterval(this.$root._timer);
        this.$root._timer = setTimeout(() => {
            this.$root._timer = setInterval(() => {
                this.$root.$input.stepUp();
                this.$root.dispatch('change');
                this.$root.setAttribute('value', this.$root.$input.value);
            }, 50);
        }, 300);

        this.$root.focused = true;
        this.$root.$input.stepUp();
        this.$root.setAttribute('value', this.$root.$input.value);
        this.$root.dispatch('change');
    }

    /**
     * down 按键点击事件,调用input原生的减少数据接口
     */
    _onDownMouseDown() {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readOnly) {
            return;
        }
        
        clearTimeout(this.$root._timer);
        clearInterval(this.$root._timer);
        this.$root._timer = setTimeout(() => {
            this.$root._timer = setInterval(() => {
                this.$root.$input.stepDown();
                this.$root.setAttribute('value', this.$root.$input.value);
                this.$root.dispatch('change');
            }, 50);
        }, 300);

        this.$root.focused = true;
        this.$root.$input.stepDown();
        this.$root.setAttribute('value', this.$root.$input.value);
        this.$root.dispatch('change');
    }

    /**
     * 鼠标抬起事件，控制停止增加或减少的定时器函数
     * @param {Event} event 
     */
    _onMouseUp(event) {
        clearTimeout(this.$root._timer);
        clearInterval(this.$root._timer);
    }
}

module.exports = NumInput;