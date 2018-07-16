'use stirct';

const fs = require('fs');
const ps = require('path');

const Base = require('./base');

const HTML = `
<style>
${fs.readFileSync(ps.join(__dirname, '../style/input.css'))}
</style>
${fs.readFileSync(ps.join(__dirname, '../template/input.html'))}
`;

/**
 * 绑定得到焦点的事件
 * @param {*} elem 
 */
let bindFocusEvent = function (elem) {
    elem.addEventListener('focus', () => {
        elem.$input.focus();
    });

    elem.addEventListener('blur', () => {
        elem.value = elem.$input.value;
        elem.confirm();
    });
};

/**
 * 绑定鼠标点击的事件
 * @param {*} elem 
 */
let bindKeyboardEvent = function (elem) {
    elem.addEventListener('keydown', (event) => {
        switch (event.keyCode) {
            case 13:
                elem.value = elem.$input.value;
                elem.confirm();
                break;
            case 27:
                elem.$input.value = elem.value;
                break;
        }
    });
};

class Input extends Base {

    constructor () {
        super();

        this.shadowRoot.innerHTML = HTML;
        this.$input = this.shadowRoot.querySelector('input');
        bindFocusEvent(this);
        bindKeyboardEvent(this);

        this.$input.value = this.getAttribute('value') || '';
        this.$input.placeholder = this.getAttribute('placeholder') || '';

        this.$input.readOnly = this.getAttribute('readonly') !== null;
        this.$input.type = this.getAttribute('password') !== null ? 'password' : 'text';
    }

    static get observedAttributes () {
        return ['value'];
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