'use strict';

const fs = require('fs');
const path = require('path');

const { nodeList } = require('../../utils');
const Base = require('../base');
let customStyle = '';

const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './select.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './select.html'), 'utf8')}`;

const instanceArray = [];

class Select extends Base {

     /**
      * 使用第三方提供的样式显示当前的元素,select内的option的样式也需经由此接口
      * @param {file} src
      */
    static importStyle(src) {
        if (!fs.existsSync(src)) {
            return;
        }

        // 读取 css 并设置到节点内
        customStyle = fs.readFileSync(src, 'utf8');

        // 循环已经使用的节点，设置新的 css
        instanceArray.map((elem) => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    /////////////////////////////////////////////////////

    get multiple() {
        return this.$select.multiple;
    }

    set multiple(val) {
        this.$select.multiple = !!val;
    }

    get value() {
        return this.$select.getAttribute('value');
    }

    set value(val) {
        this.$select.setAttribute('value', val);
    }

    get autofocus() {
        return this.hasAttribute('autofocus');
    }

    set autofocus(val) {
        if (val !== null) {
            this.$select.focus();
        }
    }

    // get set focused
    // get set disabled
    // get _shiftFlag

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$slot = (this.shadowRoot.querySelectorAll('slot'))[0];
        this.$placeholder = this.shadowRoot.querySelector('#placeholder');
        // 指定会影响tab焦点的内部元素
        this.$child = this.$select = this.shadowRoot.querySelector('#content');
        this.$slot.$root = this.$placeholder.$root = this.$select.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        // 实例创建回调
        super.connectedCallback();

        // 初始化基本属性
        this.autofocus = this.getAttribute('autofocus');
        this.disabled = this.getAttribute('disabled') !== null;
        this.$select.value = this.value;

        // 缓存节点
        nodeList.push(this);
        instanceArray.push(this);

        // 添加鼠标事件
        this.$select.addEventListener('change', this._selectChange);

        // 监听slot内dom更新事件
        this.$slot.addEventListener('slotchange', this._slotChange);
        this.$slot.addEventListener('DOMSubtreeModified', this._slotTextChange);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback();

        // 移除缓存的节点
        const index = instanceArray.indexOf(this);
        const i = nodeList.indexOf(this);
        instanceArray.splice(index, 1);
        nodeList.splice(i, 1);

         // 销毁鼠标事件
        this.$select.removeEventListener('change', this._selectChange);

        // 销毁slot变化监听
        this.$slot.addEventListener('slotchange', this._slotChange);
        this.$slot.removeEventListener('DOMSubtreeModified', this._slotTextChange);
    }

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return ['focused', 'readonly', 'disabled', 'value', 'multiple', 'placeholder'];
    }

    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr) {
            case 'value':
                this.value = newValue;
                if (this.value && this.value !== 'null' && this.value !== 'undifined') {
                    this.$placeholder.style.display = 'none';
                } else {
                    this.$placeholder.style.display = 'block';
                }
                break;
            case 'placeholder':
                this.$placeholder.innerHTML = newValue;
                if (this.value && this.value !== 'null' && this.value !== 'undifined') {
                    this.$placeholder.style.display = 'none';
                } else {
                    this.$placeholder.style.display = 'block';
                }
                break;
            default:
                break;
        }
    }

    ///////////////////////////////////////////////////////
    //私有事件

    /**
     * 监听ui-select的focus事件，转移到内层的focus
     * @param {Event} event
     */
    _onFocus(event) {
        super._onFocus(event);
        // 判断是否已按下shift键
        if (this._shiftFlag) {
            return;
        }
        this.$select.focus();
    }

    /**
     * 监听select的change事件，响应到外层
     */
    _selectChange() {
        if (this.disabled || this.readonly) {
            return;
        }
        this.$root.setAttribute('value', this.value);
        this.$root.dispatch('change');
        this.$root.dispatch('confirm');
    }

    // 监听slot内元素的删除或插入，change事件，动态响应内部select的option选项
    _slotChange() {
        // 先清空select内的代码
        this.$root.$select.innerHTML = '';

        // 获取slot现渲染的节点信息
        let nodes = this.assignedNodes();

        // 遍历节点，复制一份到内部select
        for (let node of nodes) {
            if (node.tagName === 'OPTION' || node.tagName === 'OPTGROUP') {
                let optionNode = document.importNode(node, true);
                this.$root.$select.appendChild(optionNode);
            }
        }
        this.$root.$select.value = this.$root.value;
    }

    // 监听 slot 内元素的其他特性更改
    _slotTextChange() {
        const that = this.$root;
        // 先清空select内的代码
        that.$select.innerHTML = '';
        for (let node of that.children) {
            if (node.tagName === 'OPTION' || node.tagName === 'OPTGROUP') {
                let optionNode = document.importNode(node, true);
                that.$select.appendChild(optionNode);
            }
        }
        that.$select.value = that.value;
    }
    // _onKeyDown
    // _onKeyUp
}

module.exports = Select;
