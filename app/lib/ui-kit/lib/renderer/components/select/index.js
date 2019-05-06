'use strict';

const fs = require('fs');
const path = require('path');

const { nodeList } = require('../../utils');
const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './select.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './select.html'), 'utf8')}`;
const instanceArray = [];
let customStyle = '';

/**
 * Attribute
 *
 *   disabled: 禁用组件，显示灰色，无法输入，无法选中
 *   readonly: 可以选中，无法输入
 *   invalid: 无效数据
 *
 *   value: 当前选中的值
//  *   multiple: 是否允许多选 
 */

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

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return [
            'readonly',
            'disabled',
            'invalid',

            'value',
            'placeholder',
        ];
    }

    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr) {

            case 'invalid':
                if (newValue !== null) {
                    process.nextTick(() => {
                        this.$select.value = '';
                    });
                }
                break;

            case 'value':
                // 无效状态在被修改后应该重置
                if (this.invalid) {
                    this.invalid = false;
                }

                this.value = newValue;
            
                // 更新 placeholder
                if (this.value && this.value !== 'null' && this.value !== 'undifined') {
                    this.$placeholder.style.display = 'none';
                } else {
                    this.$placeholder.style.display = 'block';
                }
                break;

            case 'placeholder':
                this.$placeholder.innerHTML = newValue;
                break;
            default:
                break;
        }
    }

    /////////////////////////////////////////////////////

    get value() {
        return this.$select.getAttribute('value');
    }

    set value(val) {
        this.$select.value = val;
        this.$select.setAttribute('value', val);
    }

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

        // 添加鼠标事件
        this.$select.addEventListener('change', this._selectChange);

        // 监听slot内dom更新事件
        this.$slot.addEventListener('slotchange', this._slotChange);
        this.$slot.addEventListener('DOMSubtreeModified', this._slotTextChange);
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        // 实例创建回调
        super.connectedCallback();

        // 缓存节点
        nodeList.push(this);
        instanceArray.push(this);

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
    }

    ///////////////////////////////////////////////////////
    //私有事件

    /**
     * 监听 ui-select 的 focus 事件，转移到内层的 focus
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
     * 监听 select 的 change 事件，响应到外层
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
