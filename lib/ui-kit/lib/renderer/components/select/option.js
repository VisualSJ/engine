'use strict';

const fs = require('fs');
const path = require('path');

const Base = require('../base');
const DomUtils = require('../../domUtils');

let customStyle = '';

const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './option.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './option.html'), 'utf8')}`;
const instanceArray = [];

class Option extends Base {
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

    //////////////////////////////////////////////////////
    
    get value () {
        return this.getAttribute('value') || this.textContent;
    }

    get hover () {
        return this.hasAttribute('hover');
    }

    set hover (val) {
        if (val) {
            this.setAttribute('hover', '');
        } else {
            this.removeAttribute('hover');
        }
    }

    get disabled () {
        return this.hasAttribute('disabled');
    }

    set disabled (val) {
        if (val) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    get selected () {
        return this.hasAttribute('selected');
    }

    set selected (val) {
        if (val) {
            this.setAttribute('selected', '');
        } else {
            this.removeAttribute('selected');
        }
    }

    /**
     * 构造函数
     */
    constructor () {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
    }

    /**
     * 插入文档流
     */
    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();

        //初始化属性
        this._optionSelected();
        this.disabled = this.getAttribute('disabled') !== null;

        //缓存节点
        instanceArray.push(this);

        //添加事件
        this.addEventListener('mouseenter', this._onMouseEnter);
        this.addEventListener('click', this._onClick);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 移除文档流
     */
    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();

        //删除缓存节点
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        //销毁事件
        this.removeEventListener('mouseenter', this._onMouseEnter);
        this.removeEventListener('click', this._onClick);
    }

    /**
     * 控制hover项，对外方法
     * @param {Boolean} val 
     */
    optionHover (val) {
        this.hover = val;
    }

    /////////////////////////////////////////////////////////////
    //私有事件

    /**
     * click事件
     * @param {Event} event 
     */
    _onClick(event) {
        if (this.disabled || this.grougDisabled || this.readonly ) {
            return;
        }
        DomUtils.acceptEvent(event);
        DomUtils.fire(this, 'optionClick', {
            bubbles: true,
            detail: { value: this.value ,valueText:this.innerHTML}
        });
    };

    /**
     * 鼠标移入事件，获取当前hover的项
     * @param {Event} event 
     */
    _onMouseEnter(event) {
        this.parentNode.hoverindex = [...this.parentNode.children].indexOf(this);
    };

    /////////////////////////////////////////////////////////
    //私有方法

    _optionSelected () {
        if (!this.parentNode.multiple) {
            this.selected = this.value === this.parentNode.value;
        } else {
            this.selected = this.parentNode.value.includes(this.value);
        }
        if (this.selected) {
            this.parentNode.updateContent(this.textContent);
        }
    }

}

module.exports = Option;
