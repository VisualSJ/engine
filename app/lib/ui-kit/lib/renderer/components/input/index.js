'use stirct';

const fs = require('fs');
const path = require('path');
const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './input.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './input.html'), 'utf8')}`;
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
 *   password: 所有输入文字都显示成 *
 *   placeholder: 没有输入的时候显示的灰色提示文字
 *   show-clear: 是否显示清除 value 的按钮
 */

class Input extends Base {

    /**
     * 使用第三方提供的样式显示当前的元素
     * @param {file} src
     */
    static importStyle(src) {
        if (!fs.existsSync(src)) {
            return;
        }

        // 读取 css 并缓存到模块变量内
        customStyle = fs.readFileSync(src, 'utf8');

        // 应用到之前所有的模块上
        instanceArray.map((elem) => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    /**
     * 监听的 Attribute
     */
    static get observedAttributes() {
        return [
            'disabled',
            'readonly',
            'invalid',

            'value',
            'password',
            'placeholder',
            'show-clear',
        ];
    }

    /**
     * Attribute 更改后的回调
     * @param {*} attr
     * @param {*} oldData
     * @param {*} newData
     */
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
                    break;
                }
                this.$input.value = newData;
                break;
            case 'placeholder':
                this.$input.placeholder = newData;
                break;

            case 'password':
                this.$input.type = newData !== null ? 'password' : 'text';
                break;
            case 'show-clear':
                if (this.value !== '' && this['show-clear']) {
                    this.$clear.style.display = 'inline-block';
                } else {
                    this.$clear.style.display = 'none';
                }
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
        val += '';
        this.setAttribute('value', val);
    }

    get password() {
        return this.getAttribute('password') !== null;
    }
    set password(bool) {
        if (bool) {
            this.setAttribute('password', '');
        } else {
            this.removeAttribute('password');
        }
    }

    get placeholder() {
        return this.$input.getAttribute('placeholder');
    }

    set placeholder(val) {
        val += '';
        this.$input.setAttribute('placeholder', val);
    }

    get 'show-clear'() {
        return this.getAttribute('show-clear') !== null;
    }
    set 'show-clear'(val) {
        if (val) {
            this.setAttribute('show-clear', '');
        } else {
            this.removeAttribute('show-clear');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$input = this.shadowRoot.querySelector('input');
        this.$clear = this.shadowRoot.querySelector('.clear');

        // 指定会影响tab焦点的内部元素
        this.$input.$root = this.$clear.$root = this;

        // 焦点在内部的 input 的时候，缓存的数据，用于 esc 还原数据
        this._staging = null;

        // 绑定事件
        this.$input.addEventListener('focus', this._onInputFocus);
        this.$input.addEventListener('blur', this._onInputBlur);
        this.$input.addEventListener('input', this._onInputChange);
        this.$clear.addEventListener('click', this._onClear, true);
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存元素
        instanceArray.push(this);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 移除缓存的元素对象
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
    }

    // get set focused
    // get set disabled
    // get _shiftFlag

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
        if (this.disabled || this.readonly) {
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
            this.$root._confirm(true);
        }
        // 取消缓存的数据
        this.$root._staging = null;
    }

    /**
     * input 数据修改
     */
    _onInputChange() {
        // 更新 clear 按钮状态
        if (this.value !== '' && this.$root['show-clear']) {
            this.$root.$clear.style.display = 'inline-block';
        } else {
            this.$root.$clear.style.display = 'none';
        }

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
        }
    }

    /**
     * 点击清除按钮
     */
    _onClear() {
        this.style.display = 'none';
        this.$root._clear();
    }

    //////////////////////////

    _confirm(ignore) {
        const inputFocused = this._staging !== null;

        // 如果数据修改，则发送 confirm 事件
        if (this._staging !== null && this._staging !== this.value) {
            this._staging = this.value;
            this.dispatch('change');
            this.dispatch('confirm');
        }

        if (!ignore) {
            if (inputFocused) {
                this.focus();
            } else {
                this.$input.focus();
            }
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

    _clear() {
        if (this.value === '') {
            return;
        }
        this.value = '';
        this.$input.value = '';
        this.dispatch('change');
        this.dispatch('confirm');

        this.focus();
    }

    // _onKeyDown
    // _onKeyUp
}

module.exports = Input;
