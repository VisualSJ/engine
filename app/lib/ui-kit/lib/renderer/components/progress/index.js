'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './progress.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './progress.html'), 'utf8')}`;
const instanceArray = [];

let customStyle = '';

class Progress extends Base {

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

    get value() {
        return this.getAttribute('value');
    }

    set value(val) {
        if (val) {
            val = parseFloat(val);
            if (val < 0) {
                val = 0;
            }
            if (val > 100) {
                val = 100;
            }
            this.setAttribute('value', val);
        } else {
            this.removeAttribute('value');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        this.$label = this.shadowRoot.querySelector('.label');
        this.$bar = this.shadowRoot.querySelector('.bar');
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

    // get set focused
    // get set disabled

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
            newData = parseFloat(newData);
            if (newData < 0) {
                newData = 0;
            }
            if (newData > 100) {
                newData = 100;
            }
            this.$bar.style.width = newData + '%';
            this.$label.innerHTML = newData + '%';
            break;
        }
    }
}

module.exports = Progress;
