'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './input.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './input.html'), 'utf8')}`;
const instanceArray = [];

let customStyle = '';

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
        instanceArray.map(elem => {
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
            'value',
            'placeholder',
            'readonly',
            'password',
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
            case 'value':
                this.$input.value = newData;
                break;
            case 'placeholder':
                this.$input.placeholder = newData;
                break;
            case 'readonly':
                this.$input.readOnly = newData !== null;
                break;
            case 'password':
                this.$input.type = newData !== null ? 'password' : 'text';
                break;
        }
    }

    ////////////////////////////
    //
    get value() {
        return this.getAttribute('value') || '';
    }

    set value(val) {
        val += '';
        this.setAttribute('value', val);
    }

    get placeholder() {
        return this.$input.getAttribute('placeholder');
    }

    set placeholder(val) {
        val += '';
        this.$input.setAttribute('placeholder', val);
    }

    get password() {
        return this.getAttribute('password') !== null;
    }

    set password(val) {
        if (val) {
            this.setAttribute('password', '');
        } else {
            this.removeAttribute('password');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$input = this.shadowRoot.querySelector('input');
        this.$input.$root = this;
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

        // 绑定事件
        this.addEventListener('focus', this._onFocus);
        this.$input.addEventListener('focus', this._onInputFocus);
        this.$input.addEventListener('blur', this._onInputBlur);
        this.$input.addEventListener('input', this._onInputChange);
        this.$input.addEventListener('keydown', this._onInputKeyDown);  
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 移除缓存的元素对象
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 取消绑定事件
        this.removeEventListener('focus', this._onFocus);
        this.$input.removeEventListener('focus', this._onInputFocus);
        this.$input.removeEventListener('blur', this._onInputBlur);
        this.$input.removeEventListener('input', this._onInputChange);
        this.$input.removeEventListener('keydown', this._onInputKeyDown);
    }

    // get set focused
    // get set disabled

    //////////////////////
    // 私有事件

    /**
     * 获得了焦点
     * 需要将焦点转移到 input 元素上
     */
    _onFocus(event) {
        super._onFocus(event);
        this.$input.focus();
    }

    /**
     * input 获得了焦点
     * 需要记录现在的 value 数据
     */
    _onInputFocus() {
        //判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        this.$root._staging = this.$root.value;
    }

    /**
     * input 丢失焦点
     */
    _onInputBlur() {
        //判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        delete this.$root._staging;
        if(this.$root._staging === this.$root.value) {
            return;
        }
        this.$root.dispatch('confirm');
    }

    /**
     * input 被修改
     */
    _onInputChange() {
        //判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        this.$root.value = this.value;
        this.$root.dispatch('change');
    }

    /**
     * input 键盘按下事件
     * @param {Event} event
     */
    _onInputKeyDown(event) {
        //判断是否为可读或禁用
        if (this.disabled || this.readOnly) {
            return;
        }
        switch (event.keyCode) {
            case 13: // 回车
                if(this.$root._staging === this.$root.value) {//先判断值是否发生更改
                    break;
                }
                this.$root.dispatch('confirm');
                this.$root._staging = this.$root.value;
                break;
            case 27: // esc
                if(this.$root._staging === this.$root.value) {//先判断值是否发生更改
                    break;
                }
                this.$root.value = this.$root._staging;
                this.$root.dispatch('change');
                this.$root.dispatch('cancel');
                break;
        }
    }
}

module.exports = Input;