'use stirct';

const fs = require('fs');
const path = require('path');

const Base = require('../base');

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './button.css'), 'utf8')}</style>`;
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './button.html'), 'utf8')}`;
const instanceArray = [];

let customStyle = '';

class Button extends Base {

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

    get pressed() {
        return this.getAttribute('pressed') !== null;
    }

    set pressed(bool) {
        bool = !!bool;
        if (bool) {
            this.setAttribute('pressed', '');
        } else {
            this.removeAttribute('pressed');
        }
    }

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存已经放入文档流的节点
        instanceArray.push(this);

        // 绑定键盘事件
        this.addEventListener('keydown', this._onKeyDown);
        this.addEventListener('keyup', this._onKeyUp);

        // 绑定鼠标事件
        this.addEventListener('mousedown', this._onMouseDown);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        super.disconnectedCallback()

        // 移除缓存的节点
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 取消绑定键盘事件
        this.addEventListener('keydown', this._onKeyDown);
        this.addEventListener('keyup', this._onKeyUp);

        // 取消绑定鼠标事件
        this.removeEventListener('mousedown', this._onMouseDown);
    }

    // get set focused
    // get set disabled

    //////////////////////
    // 私有事件

    /**
     * 鼠标点击事件
     * 按下鼠标的时候，向 document 绑定 up 事件，并设置 pressed 属性
     */
    _onMouseDown() {
        // disabled 的时候不需要响应点击
        if (this.disabled) {
            return;
        }

        // 点击后更新状态
        this.pressed = true;
        const mouseUp = () => {
            this.pressed = false;
            this.dispatch('confirm');
            document.removeEventListener('mouseup', mouseUp);
        };

        document.addEventListener('mouseup', mouseUp);
    }

    /**
     * 键盘点击事件
     * 按下回车和空格应该都需要显示点击状态
     * @param {Event} event 
     */
    _onKeyDown(event) {
        switch (event.keyCode) {
            case 32:
            case 13:
                this.pressed = true;
                break;
        }
    }

    /**
     * 键盘点击后抬起的事件
     * 按下回车和空格抬起后都需要取消 press 状态
     * @param {Event} event 
     */
    _onKeyUp(event) {
        switch (event.keyCode) {
            case 32:
            case 13:
                this.pressed = false;
                this.dispatch('confirm');
                break;
        }
    }
}

module.exports = Button;