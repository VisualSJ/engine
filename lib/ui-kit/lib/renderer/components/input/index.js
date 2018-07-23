'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './input.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './input.html'), 'utf8')}`;
const instanceArray = [];
/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {
    const onClick = () => {};
    const onFocus = () => {
        instance.$input.focus();
    };
    const onBlur = () => {
        instance.value = instance.$input.value;
        instance.confirm();
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
    const onKeyDown = event => {
        switch (event.keyCode) {
            case 13:
                instance.value = instance.$input.value;
                instance.confirm();
                break;
            case 27:
                instance.$input.value = instance.value;
                break;
        }
    };

    if (detach) {
        instance.removeEventListener('keydown', onKeyDown);
    } else {
        instance.addEventListener('keydown', onKeyDown);
    }
};
/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class Input extends Base {
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

    static get observedAttributes () {
        return ['value'];
    }

    constructor () {
        super();

        this.shadowRoot.innerHTML = createDomContent();
        this.$input = this.shadowRoot.querySelector('input');
        this.$input.value = this.getAttribute('value') || '';
        this.$input.placeholder = this.getAttribute('placeholder') || '';
        this.$input.readOnly = this.getAttribute('readonly') !== null;
        this.$input.type = this.getAttribute('password') !== null ? 'password' : 'text';
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
        controlKeyboardEvent(this);
        controlMouseEvent(this);
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlKeyboardEvent(this, true);
        controlMouseEvent(this, true);
        instanceArray.splice(index, 1);
    }

    attributeChangedCallback (attr, o, n) {
        switch (attr) {
            case 'value':
                this.$input.value = n;
                break;
        }
    }

    get value () {
        return this.getAttribute('value') || '';
    }

    set value (val) {
        val += '';
        this.setAttribute('value', val);
        this.confirm();
    }

    get placeholder () {
        return this.$input.getAttribute('placeholder');
    }

    set placeholder (val) {
        this.$input.setAttribute('placeholder', val);
    }

    get readOnly () {
        return this.$input.readOnly;
    }

    set readOnly (val) {
        this.$input.readOnly = !!val;
    }

    get password () {
        return s === 'password';
    }

    set password (val) {
        this.$input.type = !!val ? 'password' : 'text';
    }

    // get set focused
    // get set disabled
}

module.exports = Input;
