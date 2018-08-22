'use strict';

const path = require('path');
const fs = require('fs');

const Base = require('../base');

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
        this.$headerSlot = this.shadowRoot.querySelector('slot[name="header"]');
        this.$headerSlot.$root = this;
    }

    connectedCallback() {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);

        // 绑定鼠标事件
        this.$headerSlot.addEventListener('click', this._onClick);

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
        this.$headerSlot.removeEventListener('click', this._onClick);
    }

    // 变更回调
    attributeChangedCallback(attr, o, n) {
        switch (attr) {
            case 'header':
                this._updateHeader(o, n);
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

    ////////////////////////////////////
    //私有事件

    /**
     * section点击展开
     */
    _onClick() {
        this.$root.expand = !this.$root.expand;
    };
}

module.exports = Section;
