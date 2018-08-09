'use strict';

//////////////
// 27 esc 恢复上一次记录的数据
// 32 space 无特殊响应
// 13 enter 记录数据并触发 confirm
// 38 up / 40 down: 加减 step 数据
// 37 left / 39 right: 无特殊响应

const fs = require('fs');
const path = require('path');
// const ColorPicker = require('./../color-picker/index.js');
// window.customElements.define('color-picker', ColorPicker);

const Base = require('../base');
let customStyle = '';
const Chroma = require('chroma-js');
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './color.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './color.html'), 'utf8')}`;
const instanceArray = [];


/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (instance, detach = false) {


};
/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {

    const onClick = () => {
        if (instance.disabled || instance.readOnly) {
            return;
        } else {
            instance.$colorPicker.style.display = "block";
            instance.$colorPicker.value = instance.value;
        }
    };
    const onFocus = () => {
        instance.focus();
    };

    const onBlur = () => {
        if (instance.disabled || instance.readOnly) {
            return;
        } else {
            instance.$colorPicker.style.display = "none";
        }

    };
    
    if (detach) {
        instance.removeEventListener('click', onClick, false);
        instance.removeEventListener('blur', onBlur, false);
    } else {
        instance.addEventListener('click', onClick, false);
        instance.addEventListener('blur', onBlur, false);
    }
};
/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;

class Color extends Base {
    static importStyle(src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(instance => {
                const el = instance.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    static get observedAttributes() {
        return ['value'];
    }

    constructor() {
        super();
        this.shadowRoot.innerHTML = createDomContent();
        this.$colorWrap = this.shadowRoot.querySelector('.color-wrap');
        this.$color = this.shadowRoot.querySelector('.color');
        this.$alpha = this.shadowRoot.querySelector('.alpha-line');
        this.readOnly = this.getAttribute('readonly') !== null;
        this.disabled = this.getAttribute('disabled') !== null;
        if (this.readOnly || this.disabled) {

        } else {
            this.$colorPicker = document.createElement('ui-color-picker');
            this.$colorWrap.appendChild(this.$colorPicker);
            this.$colorPicker.style.display = "none";
            this.$colorPicker.addEventListener('click', (e) => {
                e.stopPropagation();
            }, false)
            this.bindColorChange(true);
        }
    }

    connectedCallback() {
        // 实例创建回调
        super.connectedCallback();
        instanceArray.push(this);
        controlMouseEvent(this);
    }

    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        this.bindColorChange(false);
        instanceArray.splice(index, 1);
    }

    attributeChangedCallback(attr, o, n) {
        switch (attr) {
            case 'value':
                this.updateColor();
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
            value = JSON.stringify(val);
        } else {
            value = JSON.stringify(Chroma(val).rgba());
        }
        this.setAttribute('value', value);

    }

    updateColor() {
        //更新显示的颜色
        let color = Chroma(this.value);
        let rgbValue = color.rgb();
        this.$alpha.style.width = color.alpha() * 100 + "%";
        this.$color.style.backgroundColor = Chroma(rgbValue).css();
    }

    bindColorChange(detach) {
        //绑定艳色选择器的选择回调函数
        const changeTypeHandle = () => {
            this.value = this.$colorPicker.value;
            this.updateColor();
        }

        if(detach){
            this.$colorPicker.addEventListener('change',changeTypeHandle);
        }else{
            this.$colorPicker.removeEventListener('change',changeTypeHandle);
        }
        
    }


}

module.exports = Color;