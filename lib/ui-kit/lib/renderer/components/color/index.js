'use strict';

//////////////
// 27 esc 恢复上一次记录的数据
// 32 space 无特殊响应
// 13 enter 记录数据并触发 confirm
// 38 up / 40 down: 加减 step 数据
// 37 left / 39 right: 无特殊响应

const fs = require('fs');
const path = require('path');
const DomUtils = require('../../domUtils');
const Base = require('../base');
let customStyle = '';
const Chroma = require('chroma-js');
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './color.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './color.html'), 'utf8')}`;
const instanceArray = [];


/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    elem._mouseEventHandles = (function(elem) {
        const _onClick = () => {
            if (elem.disabled || elem.readOnly) {
                return;
            }
            elem.oldValue = elem.value;
            elem.$colorPicker.style.display = "block";
            elem.$colorPicker.value = elem.value; 
        };

        const _onBlur = () => {
            if (elem.disabled || elem.readOnly) {
                return;
            }
            elem.value = elem.$colorPicker.value;
            elem.$colorPicker.style.display = "none";
            if(elem.changeFlag){
                elem.changeFlag = false;
                elem.confirm();
            } 
        };

        return {
            _onClick,
            _onBlur
        }
    })(elem);
    
    if (detach) {
        elem.removeEventListener('click', elem._mouseEventHandles._onClick);
        elem.removeEventListener('blur', elem._mouseEventHandles._onBlur);
    } else {
        elem.addEventListener('click', elem._mouseEventHandles._onClick);
        elem.addEventListener('blur', elem._mouseEventHandles._onBlur);
    }
};

/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (elem, detach = false) {
    elem._keyboardEventHandle = (function (elem) {
        const _onKeyDown = event => {
            switch (event.keyCode) {
                case 13:
                    elem.value = elem.$colorPicker.value;
                    if (elem.changeFlag) {
                        elem.$colorPicker.style.display = "none";
                        elem.oldValue = elem.$colorPicker.value;
                        if(elem.changeFlag){
                            elem.changeFlag = false;
                            elem.confirm();
                        }
                    }
                    elem.changeFlag = false;
                    break;
                case 27:
                    elem.$colorPicker.style.display = "none";
                    emitCancel(elem);
                    break;
            }
        };
        return _onKeyDown;
    })(elem)
    
    if (detach) {
        elem.removeEventListener('keydown', elem._keyboardEventHandle);
    } else {
        elem.addEventListener('keydown', elem._keyboardEventHandle);
    }
};

/**
 * 派发change事件
 * @param {Element} elem
 */
const emitChange = function (elem) {
    DomUtils.fire(elem, 'change', {
        bubbles: false,
        detail: {
            value: elem.value
        }
    });
    elem.value = elem.$colorPicker.value;
    updateColor(elem, elem.value);
    elem.changeFlag = true;
}

/**
 * 派发cancel事件
 * @param {Element} elem
 */
const emitCancel = function (elem) {
    // this.$colorPicker.value = this.value;
    elem.$colorPicker.value = elem.oldValue;
    elem.value = elem.oldValue;
    updateColor(elem, elem.value);
    DomUtils.fire(elem, 'cancel');
    elem.changeFlag = false;
}

/**
 * 更新颜色值
 * @param {Element} elem
 * @param {Color} value 颜色值
 */
const updateColor = function (elem, value) {
    //更新显示的颜色
    let color = Chroma(value);
    let rgbValue = color.rgb();
    elem.$alpha.style.width = color.alpha() * 100 + "%";
    elem.$color.style.backgroundColor = Chroma(rgbValue).css();
}

/**
 * 绑定colorPicker的相关事件
 * @param {Element} elem
 * @param {boolean} detach
 */
const bindColorChange = function (elem, detach = false) {
    elem._pickHandles = (function(elem) {
         //绑定颜色选择器的选择回调函数
        const _changeTypeHandle = (e) => {
            emitChange(elem);
        }

        const _cancelHandle = () => {  
            elem.$colorPicker.style.display = "none";   
            if(elem.changeFlag){
                emitCancel(elem);
            }          
        }

        return {
            _changeTypeHandle,
            _cancelHandle
        }
    })(elem)   

    if (detach) {
        elem.$colorPicker.removeEventListener('confirm', elem._pickHandles._changeTypeHandle);
        elem.$colorPicker.removeEventListener('cancel', elem._pickHandles._cancelHandle);
        elem.$colorPicker.removeEventListener('change', elem._pickHandles._changeTypeHandle);
    } else {
        elem.$colorPicker.addEventListener('confirm', elem._pickHandles._changeTypeHandle);
        elem.$colorPicker.addEventListener('cancel', elem._pickHandles._cancelHandle);
        elem.$colorPicker.addEventListener('change', elem._pickHandles._changeTypeHandle);
    }
}

/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class Color extends Base {
    static importStyle(src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(elem => {
                const el = elem.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    static get observedAttributes() {
        return ['value'];
    }

    constructor () {
        super();
        this.shadowRoot.innerHTML = createDomContent();
        this.$colorWrap = this.shadowRoot.querySelector('.color-wrap');
        this.$color = this.shadowRoot.querySelector('.color');
        this.$alpha = this.shadowRoot.querySelector('.alpha-line');
        this.readOnly = this.getAttribute('readonly') !== null;
        this.disabled = this.getAttribute('disabled') !== null;
        this.changeFlag = false;
        this.oldValue = this.value;
        this._mouseEventHandles = null;//存储鼠标事件函数
        this._keyboardEventHandle = null;//存储键盘事件函数
        this._pickHandles = null;//存储唤起的color-picker控件的事件函数
    }

    connectedCallback () {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
        controlMouseEvent(this);
        controlKeyboardEvent(this);
        if (!this.readOnly && !this.disabled) {
            this.$colorPicker = this.shadowRoot.querySelector('.color-picker');
            this.$colorPicker.addEventListener('click', (e) => {
                e.stopPropagation();
            })
            bindColorChange(this);
        }
    }

    disconnectedCallback () {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        controlKeyboardEvent(this, true);
        instanceArray.splice(index, 1);
        if (!this.readOnly && !this.disabled) {
            bindColorChange(this, true);
        }
    }

    attributeChangedCallback (attr, o, n) {
        switch (attr) {
            case 'value':
                updateColor(this, n);
                break;
        }
    }

    get value() {
        const val = this.getAttribute('value');
        let value;
        try {
            value = JSON.parse(val);
        } catch (err) {
            value = val ? Chroma(val).rgba() : [255, 255, 255, 1];
        } finally {
            return Array.isArray(value) ? value : Chroma(value).rgba();
        }
    }

    set value(val) {
        let value;
        if (Array.isArray(val)) {
            if(val.length > 3){
                value = `rgba(${val.toString()})`;
            }else{
                value = val.toString();
            }
        } else {
            value = JSON.stringify(Chroma(val).rgba());
        }
        this.setAttribute('value', value);
    }
}

module.exports = Color;