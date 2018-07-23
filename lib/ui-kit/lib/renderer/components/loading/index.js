'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './loading.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './loading.html'), 'utf8')}`;
const instanceArray = [];
/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class Loading extends window.HTMLElement {
    static importStyle (src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(instance => {
                const el = instance.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }
    constructor () {
        super();
        this.attachShadow({
            mode: 'open'
        });

        this.shadowRoot.innerHTML = createDomContent();
    }

    connectedCallback () {
        // 实例创建回调
        instanceArray.push(this);
    }

    disconnectedCallback () {
        // 实例移除回调
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
    }
}

module.exports = Loading;
