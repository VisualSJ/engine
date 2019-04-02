'use stirct';

const fs = require('fs');
const path = require('path');

const I18n = require('../../../../../i18n');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './label.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './label.html'), 'utf8')}`;
const instanceArray = [];
const prefix = 'i18n:';
let customStyle = '';

// 监听语言切换
I18n.on('switch', translateAll);

function translateAll() {
    instanceArray.forEach((el) => {
        translate(el);
    });
}

function translate(el) {
    if (el.value.startsWith(prefix)) {
        const i18n = el.value.substr(prefix.length);
        el.innerHTML = I18n.t(i18n);
    } else {
        el.innerHTML = el.value;
    }
}

class Label extends Base {

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
        this.$style = this.shadowRoot.querySelector('#custom-style');
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存已经放入文档流的节点
        instanceArray.push(this);

        // 插入自定义样式
        this.$style.innerHTML = customStyle;
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

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return ['value'];
    }

    /**
     * Attribute 更改后的回调
     * @param {*} attr
     * @param {*} oldData
     * @param {*} newData
     */
    attributeChangedCallback(attr, oldData, newData) {
        switch (attr) {
            case 'value':
            this.value = newData || '';
            translate(this);
            break;
        }
    }

}

module.exports = Label;
