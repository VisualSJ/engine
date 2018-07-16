'use stirct';

const fs = require('fs');
const ps = require('path');

const Base = require('./base');

const HTML = `
<style>
${fs.readFileSync(ps.join(__dirname, '../style/button.css'))}
</style>
<style id=""></style>
${fs.readFileSync(ps.join(__dirname, '../template/button.html'))}
`;

/**
 * 绑定键盘按下以及抬起的事件
 * @param {*} elem 
 */
let bindKeyboardEvent = function (elem) {
    elem.addEventListener('keydown', (event) => {
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
    elem.addEventListener('mousedown', (event) => {
        if (elem.disabled) {
            return;
        }
        elem.setAttribute('pressed', '');

        document.addEventListener('mouseup', buttonUp);
    });
};

class Button extends Base {

    constructor () {
        super();

        this.shadowRoot.innerHTML = HTML;
        bindKeyboardEvent(this);
        bindMouseEvent(this);

        this.addEventListener('click', () => {
            this.confirm();
        });
    }

    // get set focused
    // get set disabled
    
}

module.exports = Button;