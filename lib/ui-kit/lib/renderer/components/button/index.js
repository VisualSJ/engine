'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './button.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './button.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 绑定键盘按下以及抬起的事件
 * @param {*} elem
 */
let bindKeyboardEvent = function (elem) {
    elem.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 32:
            case 13:
                elem.setAttribute('pressed', '');
                break;
        }
    });

    elem.addEventListener('keyup', () => {
        switch (event.keyCode) {
            case 32:
            case 13:
                elem.removeAttribute('pressed');
                break;
        }
    });
};

/**
 * 绑定鼠标按下事件
 * @param {*} elem
 */
let bindMouseEvent = function (elem) {
    let buttonUp = () => {
        elem.removeAttribute('pressed');
        document.removeEventListener('mouseup', buttonUp);
    };
    elem.addEventListener('mousedown', event => {
        if (elem.disabled) {
            return;
        }
        elem.setAttribute('pressed', '');

        document.addEventListener('mouseup', buttonUp);
    });
};
/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class Button extends Base {
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
        bindKeyboardEvent(this);
        bindMouseEvent(this);

        this.addEventListener('click', () => {
            this.confirm();
        });
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback()
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
    }

    // get set focused
    // get set disabled
}

module.exports = Button;
