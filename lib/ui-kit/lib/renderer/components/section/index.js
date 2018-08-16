'use strict';

const path = require('path');
const fs = require('fs');

const Base = require('../base');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './section.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './section.html'), 'utf8')}`;
const instanceArray = [];

/**  * 创建shadow dom内容  */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    const onClick = () => {
        elem.expand = !elem.expand;
    };
    if (detach) {
        elem.$headerSlot.removeEventListener('click', onClick, false);
    } else {
        elem.$headerSlot.addEventListener('click', onClick, false);
    }
};

const updateHeaderText = function(elem, val) {
    const el = elem.shadowRoot.querySelector('slot[name="header"] span');
    if (el) {
        el.textContent = val;
    }
}

class Section extends Base {
    static importStyle (src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(elem => {
                const el = elem.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    constructor () {
        super();
        this.shadowRoot.innerHTML = createDomContent();
        this.expand = this.getAttribute('expand') !== null;
        this.$headerSlot = this.shadowRoot.querySelector('slot[name="header"]');
        this.text = this.getAttribute('text');
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
        controlMouseEvent(this);
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        instanceArray.splice(index, 1);
    }

    // 变更回调
    attributeChangedCallback (attr, o, n) {
        switch (attr) {
            case 'header':
                this._updateHeader(o, n);
                break;
            default:
                return;
        }
    }

    get text () {
        return this.getAttribute('text');
    }

    set text (val) {
        if (val) {
            this.setAttribute('text', val);
            updateHeaderText(this, val);
        } else {
            this.removeAttribute('text');
        }
    }

    get expand () {
        return this.hasAttribute('expand');
    }

    set expand (val) {
        if (val) {
            this.setAttribute('expand', '');
        } else {
            this.removeAttribute('expand');
        }
    }
}

module.exports = Section;
