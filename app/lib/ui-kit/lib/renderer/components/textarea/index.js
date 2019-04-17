'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './textarea.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './textarea.html'), 'utf8')}`;
const instanceArray = [];

let customStyle = '';

class TextArea extends Base {

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

        // 应用到之前的所有模块上
        instanceArray.map((elem) => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    ////////////////////////////

    get pressed() {
        return this.getAttribute('pressed') !== null;
    }

    set pressed(bool) {
        bool = !!bool;
        if (bool) {
            this.setAttribute('pressed', '');
        } else {
            this.removeAttribute('pressed');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$textarea = this.shadowRoot.querySelector('textarea');

        // 指定会影响tab焦点的内部元素
        this.$child = this.$textarea;
        this.$textarea.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存已经放入文档流的节点
        instanceArray.push(this);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;

        // 绑定事件
        this.$textarea.addEventListener('focus', this._onTextareaFocus);
        this.$textarea.addEventListener('blur', this._onTextareaBlur);
        this.$textarea.addEventListener('input', this._onTextareaChange);
        this.$textarea.addEventListener('keydown', this._onTextareaKeyDown);
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 移除缓存的节点
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 绑定事件
        this.$textarea.addEventListener('focus', this._onTextareaFocus);
        this.$textarea.addEventListener('blur', this._onTextareaBlur);
        this.$textarea.addEventListener('input', this._onTextareaChange);
        this.$textarea.addEventListener('keydown', this._onTextareaKeyDown);
    }

    /**
     * 监听的 attribute 修改
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
                this.$textarea.disabled = newData !== null;
                break;
            case 'value':
                this.$textarea.value = newData;
                break;
            case 'placeholder':
                this.$textarea.placeholder = newData;
                break;
            case 'readonly':
                this.$textarea.readonly = newData !== null;
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
        return this.$textarea.getAttribute('placeholder');
    }

    set placeholder(val) {
        val += '';
        this.$textarea.setAttribute('placeholder', val);
    }

    // get set focused
    // get set disabled

    //////////////////////
    // 私有事件

    /**
     * 获得了焦点
     * 需要将焦点转移到 textarea 元素上
     * @param {Event} event
     */
    _onFocus(event) {
        super._onFocus(event);
        // 判断是否已按下shift键
        if (this._shiftFlag) {
            return;
        }
        this.$textarea.focus();
        this.$textarea.select();
    }

    /**
     * textarea 获得了焦点
     * 需要记录现在的 value 数据
     */
    _onTextareaFocus() {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readonly) {
            return;
        }
        this.$root._staging = this.$root.value;
        this._staging = this.$root.value;
    }

    /**
     * textarea 丢失焦点
     */
    _onTextareaBlur() {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readonly) {
            return;
        }
        if (this.$root._staging === this.value) {
            return;
        }
        delete this.$root._staging;
        this.$root.dispatch('confirm');
    }

    /**
     * textarea 被修改
     */
    _onTextareaChange(event) {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readonly) {
            return;
        }
        if (this._staging === this.value) {
            return;
        }
        this.$root.value = this.value;
        this._staging = this.value;
        this.$root.dispatch('change');
    }

    /**
     * textarea 键盘按下事件
     * @param {Event} event
     */
    _onTextareaKeyDown(event) {
        // 判断是否为可读或禁用
        if (this.$root.disabled || this.$root.readonly) {
            return;
        }

        switch (event.keyCode) {
            case 13: // 回车
                if (this.$root._staging === this.value) { // 先判断值是否发生更改
                    break;
                }
                this.$root.dispatch('confirm');
                this.$root._staging = this.$root.value;
                break;
            case 27: // esc
                if (this.$root._staging === this.value) { // 先判断值是否发生更改
                    break;
                }
                this.$root.value = this.$root._staging;
                this._staging = this.$root.value;
                this.$root.dispatch('change');
                this.$root.dispatch('cancel');
                break;
        }
    }

    // _onKeyDown
    // _onKeyUp
}

module.exports = TextArea;
