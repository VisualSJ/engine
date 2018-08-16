'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');
const DomUtils = require('../../domUtils');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './checkbox.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './checkbox.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    elem._clickHandle = (function(elem) {
        const _onClick = () => {
            elem.toggleChecked(elem);
        };
        return _onClick;
    })(elem);
    
    if (detach) {
        elem.removeEventListener('click', elem._clickHandle, false);
    } else {
        elem.addEventListener('click', elem._clickHandle, false);
    }
};

/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (elem, detach = false) {
    elem._keyUpHandle = (function(elem) {
        const _onKeyUp = event => {
            switch (event.keyCode) {
                case 13:
                    this.toggleChecked(elem);
                    break;
                default:
                    return;
            }
        };
        return _onKeyUp;
    })(elem)
    
    if (detach) {
        elem.removeEventListener('keyup', elem._keyUpHandle);
    } else {
        elem.addEventListener('keyup', elem._keyUpHandle);
    }
};

/**
     * 切换checkbox勾选
     */
const toggleChecked = function(elem) {
    if (elem.disabled || elem.readOnly) {
        return;
    }
    elem.checked = !elem.checked;
    elem.confirm();
    elem.emitChange(elem);
}

const emitChange = function(elem) {
    DomUtils.fire(elem, 'change', {
        bubbles: false,
        detail: {
            value: elem.value
        }
    });
}

class Checkbox extends Base {
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
        this.checked = this.getAttribute('checked') !== null;
        this.readOnly = this.getAttribute('readonly') !== null;
        this._clickHandle = null;
        this._keyUpHandle = null;
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        controlMouseEvent(this);
        controlKeyboardEvent(this);
        instanceArray.push(this);
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        controlKeyboardEvent(this, true);
        instanceArray.splice(index, 1);
    }

    get checked () {
        return this.hasAttribute('checked');
    }

    set checked (val) {
        if (val) {
            this.setAttribute('checked', '');
        } else {
            this.removeAttribute('checked');
        }
    }
}

module.exports = Checkbox;