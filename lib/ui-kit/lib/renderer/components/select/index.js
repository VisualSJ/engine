'use strict';

const fs = require('fs');
const path = require('path');

const { nodeList } = require('../../utils');
const Base = require('../base');
// const Option = require('./option.js');
// window.customElements.define('select-option', Option);
const DomUtils = require('../../domUtils');
let customStyle = '';

const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './select.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './select.html'), 'utf8')}`;

const instanceArray = [];

class Select extends Base {

     /**
     * 使用第三方提供的样式显示当前的元素,select内的option的样式也需经由此接口
     * @param {file} src
     */
    static importStyle(src) {
        if (!fs.existsSync(src)) {
            return;
        }

        // 读取 css 并设置到节点内
        customStyle = fs.readFileSync(src, 'utf8');

        // 循环已经使用的节点，设置新的 css
        instanceArray.map(elem => {
            const $style = elem.shadowRoot.querySelector('#custom-style');
            $style.innerHTML = customStyle;
        });
    }

    /////////////////////////////////////////////////////

    get placeholder() {
        return this.getAttribute('placeholder');
    }

    get value() {
        const value = this.getAttribute('value');
        if (value) {
            return this.multiple ? value.split(',') : value;
        }
    }

    set value(val) {
        if (this.multiple) {
            const value = this.value.slice();
            const index = value.indexOf(val);
            if (index > -1) {
                value.splice(index, 1);
            } else if (this.multipleLimit <= 0 || value.length < this.multipleLimit) {
                value.push(val);
            }
            this.setAttribute('value', value.join(','));
        } else {
            this.setAttribute('value', val);
        }
    }

    get expand() {
        return this.hasAttribute('expand');
    }

    set expand(val) {
        if (val) {
            this.setAttribute('expand', '');
        } else {
            this.removeAttribute('expand');
            this._resetHoverIndex();
        }
    }

    get autofocus() {
        return this.hasAttribute('autofocus');
    }

    set autofocus(val) {
        if (val !== null) {
            this.setAttribute('autofocus', '');
            this.focus();
        } else {
            this.removeAttribute('autofocus');
        }
    }

    get hoverindex() {
        return +this.getAttribute('hoverindex');
    }

    set hoverindex(val) {
        this.setAttribute('hoverindex', val);
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
        // 实例创建回调
        super.connectedCallback();

        //初始化基本属性
        this.autofocus = this.getAttribute('autofocus');
        this.disabled = this.getAttribute('disabled') !== null;
        this.hoverindex = -1;
        if (this.placeholder && !this.value) {
            this.updateContent(this.placeholder);
        }

        // 缓存节点
        nodeList.push(this);
        instanceArray.push(this);

        //添加鼠标事件
        this.addEventListener('click', this._onClick);
        this.addEventListener('optionClick', this._optionChange);

        //添加键盘事件
        this.addEventListener('keydown', this._onKeyDown);
        this.addEventListener('keyup', this._onKeyUp);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 移除文档流
     */
    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback();

        // 移除缓存的节点
        const index = instanceArray.indexOf(this);
        const i = nodeList.indexOf(this);
        instanceArray.splice(index, 1);
        nodeList.splice(i, 1);

        //销毁鼠标事件
        this.removeEventListener('click', this._onClick);
        this.removeEventListener('optionClick', this._optionChange);

        //销毁键盘事件
        this.addEventListener('keydown', this._onKeyDown);
        this.addEventListener('keyup', this._onKeyUp);
    }
    
    static get observedAttributes() {
        return ['hoverindex', 'value'];
    }

    attributeChangedCallback(attr, o, n) {
        switch (attr) {
            case 'hoverindex':
                {
                    this._setHover();
                }
                break;
            case 'value': {
                this._setSelected();
            }
            default:
                break;
        }
    }
    
    /**
     * select外部点击事件处理，公有方法
     * 点击外部时隐藏下拉列表
     * @param {object} mouseup
     * @param {object} mousedown
     */
    handleClickOutside(mouseup = {}, mousedown = {}) {
        if (!mousedown.path ||!mouseup.path || mousedown.path.includes(this) || mouseup.path.includes(this)) {
            return;
        }
        this.expand = false;
    }

    /**
     * 更新当前值(子组件option需调用改方法更新值)，公有方法
     * @param {String} text
     */
    updateContent(text) {
        const el = this.shadowRoot.querySelector('div span');
        if (!this.multiple) {
            el.textContent = text;
        }
    }

    /////////////////////////////////////////
    //私有事件

    /**
     * 鼠标点击事件
     * @param {Event} event 
     */
    _onClick() {
        if (this.disabled || this.readonly) {
            return;
        }
        this.expand = !this.expand;
    };

    /**
     * 键盘抬起事件
     * 根据鼠标上下箭头控制select的展开等
     * @param {Event} event 
     */
    _onKeyUp(event) {
        if (this.disabled || this.readonly) {
            return;
        }
        switch (event.keyCode) {
            case 13:
                this._selectOption();
                break;
            case 38:
                this._navigatonOption('prev');
                break;
            case 40:
                this._navigatonOption('next');
                break;
            default:
                break;
        }
    };

    /**
     * 键盘按下事件
     * 按下回车和空格应该都需要显示点击状态
     * @param {Event} event 
     */
    _onKeyDown(event) {
        if (this.disabled || this.readonly) {
            return;
        }
        switch (event.keyCode) {
            case 9:
                this.expand = false;
                break;
            default:
                break;
        }
    };

    /////////////////////////////////////////
    //私有方法

    /**
     * 设置hover项
     */
    _setHover() {
        [...this.children].map((child, index) => {
            const isHover = index === this.hoverindex;
            child.optionHover && child.optionHover(isHover);
        });
    }

    /**
     * 设置选择项
     */
    _setSelected() {
        [...this.children].map(child => {
            child.optionSelected && child.optionSelected();
        });
        this.expand = false;
    }

    /**
     * 重置hover项值
     */
    _resetHoverIndex() {
        if (!this.multiple) {
            this.hoverindex = [...this.children].findIndex(child => child.value === this.value);
        } else {
            if (this.value.length > 0) {
                this.hoverindex = Math.min.apply(
                    null,
                    this.value.map(item =>
                        [...this.children].findIndex(child => child.value === this.value)
                    )
                );
            } else {
                this.hoverindex = -1;
            }
        }
    }

    /**
     * 按下enter键，选中某项值
     */
    _selectOption() {
        if (!this.expand) {
            this.expand = true;
        } else {
            if (this.children[this.hoverindex]) {
                this.value = this.children[this.hoverindex].value;
                this.valueText = this.children[this.hoverindex].innerHTML;
                this.dispatch('change');
                this.dispatch('confirm');
            }
        }
    }

    /**
     * 上下方向键导航选项
     * @param {string} direction
     */
    _navigatonOption(direction) {
        if (!this.expand) {
            this.expand = true;
            return;
        }
        if (this.children.length === 0) {
            return;
        }
        const allDisabled = [...this.children].every(child => child.disabled);
        if (!allDisabled) {
            if (direction === 'prev') {
                this.hoverindex--;
                if (this.hoverindex < 0) {
                    this.hoverindex = this.children.length - 1;
                }
            } else if (direction === 'next') {
                this.hoverindex++;
                if (this.hoverindex === this.children.length) {
                    this.hoverindex = 0;
                }
            }
            const child = this.children[this.hoverindex];
            if (child.disabled || child.groupDisabled) {
                this._navigatonOption(direction);
            }
        }
    }

    /**
     * 监听option的选中事件
     * @param {Event} event 
     */
    _optionChange(event) {
        const { value, valueText } = event.detail;
        this.value = value;
        this.valueText = valueText;
        this.dispatch('change');
        this.dispatch('confirm');
    }
}

module.exports = Select;
