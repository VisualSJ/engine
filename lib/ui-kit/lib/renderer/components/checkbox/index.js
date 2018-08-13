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
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {
    const onClick = () => {
        instance.toggleChecked();
    };
    if (detach) {
        instance.removeEventListener('click', onClick, false);
    } else {
        instance.addEventListener('click', onClick, false);
    }
};
/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (instance, detach = false) {
    const onKeyUp = event => {
        switch (event.keyCode) {
            case 13:
                this.toggleChecked();
                break;
            default:
                return;
        }
    };
    if (detach) {
        instance.removeEventListener('keyup', onKeyUp);
    } else {
        instance.addEventListener('keyup', onKeyUp);
    }
};

class Checkbox extends Base {
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
        this.shadowRoot.innerHTML = createDomContent();

        this.checked = this.getAttribute('checked') !== null;
        this.readOnly = this.getAttribute('readonly') !== null;
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

    /**
     * 切换checkbox勾选
     */
    toggleChecked () {
        if (this.disabled || this.readOnly) {
            return;
        }
        this.checked = !this.checked;
        this.confirm();
        this.emitChange();
    }

    emitChange () {
        DomUtils.fire(this, 'change', {
            bubbles: false,
            detail: {
                value: this.value
            }
        });
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
