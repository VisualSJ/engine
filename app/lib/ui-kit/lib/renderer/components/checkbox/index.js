'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './checkbox.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './checkbox.html'), 'utf8')}`;
const instanceArray = [];

let customStyle = '';

/**
 * Attribute
 *
 *   disabled: 禁用组件，显示灰色，无法输入，无法选中
 *   readonly: 可以选中，无法输入
 *   invalid: 无效数据
 *
 *   value: 当前的选中值
 *   checked: 是否勾选
 */

class Checkbox extends Base {

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

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return [
            'disabled',
            'readonly',
            'invalid',

            'value',
            'checked',
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
                break;
            case 'readonly':
                break;
            case 'invalid':
                break;

            case 'value':
                if (newData === null) {
                    this.removeAttribute('checked');
                } else {
                    this.setAttribute('checked', newData);
                }
                break;
            case 'checked':
                break;
        }
    }

    //////////////////////////////////////////////

    // disabled
    // readonly
    // invalid

    get value() {
        return this.getAttribute('value') !== null;
    }
    set value(bool) {
        if (bool) {
            this.setAttribute('value', '');
        } else {
            this.removeAttribute('value');
        }
    }

    get checked() {
        return this.getAttribute('checked') !== null;
    }
    set checked(bool) {
        if (bool) {
            this.setAttribute('checked', '');
        } else {
            this.removeAttribute('checked');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;

        // 绑定事件
        this.addEventListener('click', this._onClick);
        this.addEventListener('keydown', this._onKeyDown);
        this.addEventListener('keyup', this._onKeyUp);
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
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // 移除缓存的节点
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
    }

    //////////////////////
    // 私有事件

    /**
     * 点击事件
     * 切换选中状态
     */
    _onClick() {
        // disabled 或 readonly 不响应事件
        if (this.disabled || this.readonly) {
            return;
        }

        if (this.invalid) {
            this.invalid = false;
        }

        this.value = !this.value;
        this.dispatch('change');
        this.dispatch('confirm');
    }

    /**
     * 键盘按下事件
     * 切换 pressed 状态
     */
    _onKeyDown() {
        if (this.disabled || this.readonly) {
            return;
        }
        this.setAttribute('pressed', '');
    }

    /**
     * 键盘按下事件
     * 取消 pressed 状态
     * 切换选中状态
     * @param {*} event
     */
    _onKeyUp(event) {
        // disabled 或 readonly 不响应事件
        if (this.disabled || this.readonly) {
            return;
        }
        this.removeAttribute('pressed');
        // 如果是空格和回车，则切换 checked
        switch (event.keyCode) {
            case 32:
            case 13:
                this.checked = !this.checked;
                this.dispatch('change');
                this.dispatch('confirm');
                break;
        }
    }
}

module.exports = Checkbox;
