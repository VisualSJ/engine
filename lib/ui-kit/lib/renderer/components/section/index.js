'use strict';

const path = require('path');
const fs = require('fs');

const Base = require('../base');
const { domUtils } = require('../../utils');

let customStyle = '';
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './section.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './section.html'), 'utf8')}`;
const instanceArray = [];

class Section extends Base {
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
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.expand = this.getAttribute('expand') !== null;
        this.$header = this.shadowRoot.querySelector('#header');
        this.$headerSlot = this.shadowRoot.querySelector('slot[name="header"]');
        this.$header.$root = this;
    }

    connectedCallback() {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);

        // 绑定鼠标事件
        this.$header.addEventListener('click', this._onHeaderClick);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 移除鼠标事件
        this.$header.removeEventListener('click', this._onHeaderClick);
    }

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return ['focused', 'readonly', 'disabled', 'header', 'expand'];
    }

    // 变更回调
    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr) {
            case 'header':
                if (oldValue === newValue) {
                    break;
                }
                this._updateHeader(newValue);
                break;
            case 'readonly':
                newValue = newValue !== null;
                this.updateUIAttr('readonly', newValue, this);
                break;
            case 'disabled':
                newValue = newValue !== null;
                this.updateUIAttr('disabled', newValue, this);
                break;
            default:
                return;
        }
    }

    get expand() {
        return this.hasAttribute('expand');
    }

    set expand(val) {
        if (val) {
            this.setAttribute('expand', '');
        } else {
            this.removeAttribute('expand');
        }
    }

    get header() {
        return this.getAttribute('header');
    }

    set header(val) {
        if (val) {
            this.setAttribute('header', val);
        } else {
            this.removeAttribute('header');
        }
    }

    /**
     * 批量修改目标组件内子组件内部属性的方法
     * @param {String} attrName
     * @param {*} value
     */
    updateUIAttr(attrName, value, parentNode) {
        if (!parentNode.childNodes) {
          return;
        }

        for (let item of parentNode.childNodes) {
          if (!domUtils.isUIComponent(item)) {
            continue;
          }
          item[attrName] = !!value;
        }
      }

    ////////////////////////////////////
    //私有事件

    /**
     * section头部点击展开
     */
    _onHeaderClick() {
        this.$root.expand = !this.$root.expand;
    }

    /**
     * focus事件
     */
    _onFocus() {
        if (this._noFocusFlag) {
            return;
        }
        this.focused = true;
    }

    /**
     * mousedown点击事件
     * @param {Event} event
     */
    _onMouseDown(event) {
        // 当内部组件元素点击时，不触发focus事件，防止与ui-prop组合时发生抖动
        if (event.target !== this && !this.$header.contains(event.target) && event.target.slot !== 'header') {
            this._noFocusFlag = true;
            return;
        }
        this._noFocusFlag = false;
    }

    /**
     * 更新头部内容
     * @param {String} value
     */
    _updateHeader(value) {
        this.$headerSlot.innerHTML = value;
    }
}

module.exports = Section;
