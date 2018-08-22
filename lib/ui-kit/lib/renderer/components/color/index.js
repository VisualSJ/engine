'use strict';

const fs = require('fs');
const path = require('path');
const Base = require('../base');
let customStyle = '';
const Chroma = require('chroma-js');
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './color.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './color.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 颜色选择框
 * value:[255,255,255,0.5]
 */
class Color extends Base {

    /**
    * 使用第三方提供的样式显示当前的元素
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

    /**
     * 构造函数
     */
    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;
        
        this.$colorWrap = this.shadowRoot.querySelector('.color-wrap');
        this.$color = this.shadowRoot.querySelector('.color');
        this.$alpha = this.shadowRoot.querySelector('.alpha-line');

        //colorPicker供颜色选择
        this.$colorPicker = this.shadowRoot.querySelector('.color-picker');
        this.$alpha.$root = this.$color.$root = this.$colorPicker.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存节点
        instanceArray.push(this);

        // 初始化 attribute
        this.readOnly = this.getAttribute('readonly') !== null;
        this.disabled = this.getAttribute('disabled') !== null;

        //绑定color事件
        this.addEventListener('click', this._onClick);
        this.addEventListener('blur', this._onBlur);
        this.addEventListener('keydown', this._onKeyDown);

        //绑定colorPicker事件
        this.$colorPicker.addEventListener('focus', this._onColorPickerFocus);
        this.$colorPicker.addEventListener('change', this._onColorPickerChange);
        this.$colorPicker.addEventListener('cancel', this._onColorPickerCancel);
        this.$colorPicker.addEventListener('click', this._onColorPickerClick);
        
        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    static get observedAttributes() {
        return ['value'];
    }

    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr) {
            case 'value':
                this._updateColor(newValue);
                break;
        }
    }

    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        //销毁color事件
        this.removeEventListener('click', this._onClick);
        this.removeEventListener('keydown', this._onKeyDown);
        this.removeEventListener('blur', this._onBlur);

        //销毁colorPicker事件
        this.$colorPicker.removeEventListener('focus', this._onColorPickerFocus);
        this.$colorPicker.removeEventListener('change', this._onColorPickerChange);
        this.$colorPicker.removeEventListener('cancel', this._onColorPickerCancel);
        this.$colorPicker.removeEventListener('click', this._onColorPickerClick);
    }

    get value() {
        return this.$colorPicker.value;
    }

    set value(value) {
        this.$colorPicker.value = value;
    }

    //////////////////////
    // 私有事件

    /**
     * color的click事件，点击获取初始值并显示colorPicker
     */
    _onClick(event) {
        if (this.disabled || this.readOnly) {
            return;
        }
        this._staging = this.value;
        this.$colorPicker.style.display = "block";
        this.$colorPicker.value = this.value;
    };

    /**
     * color的blur事件
     */
    _onBlur() {
        if (this.disabled || this.readOnly) {
            return;
        }
        //判断值是否发生改变
        if (this.value === this._staging) {
            return;
        }
        this.value = this.$colorPicker.value;
        this.$colorPicker.style.display = "none";
        this.dispatch('confirm');
    };

    /**
     * color的键盘监听事件
     */
    _onKeyDown() {
        if (this.disabled || this.readOnly) {
            return;
        }
        switch (event.keyCode) {
            case 13:
                this.value = this.$colorPicker.value;
                if (this.changeFlag) {
                    this.$colorPicker.style.display = "none";
                    this._staging = this.$colorPicker.value;
                }
                this.changeFlag = false;
                break;
            //esc在监听colorPicker的cancel后直接响应到root
        }
    };

    /**
     * colorPicker获取焦点时，将焦点转移至color上
     */
    _onColorPickerFocus() {
        this.$root._staging = this.$root.value;
        this.$root.focus();
    }

    /**
     * colorPicker点击事件
     * 阻止冒泡到color上
     * @param {Event} event 
     */
    _onColorPickerClick(event) {
        event.stopPropagation();
    }

    /**
     * colorPicker的值发生改变
     */
    _onColorPickerChange() {
        this.$root.setAttribute('value', JSON.stringify(this.value));
        this.$root.dispatch('change');
    }

    /**
     * colorPicker的cancel事件
     * 监听此事件触发color的cancel
     */
    _onColorPickerCancel() {
        this.$colorPicker.style.display = "none";
        this.$root.dispatch('cancel');
    }

    //////////////////////////////////
    //私有处理方法

    /**
     * 更新颜色值
     * @param {Color} value 颜色值
     */
    _updateColor(value) {
        let color, rgbValue;
        value = JSON.parse(value);
        if (value.length > 3) {
            this.$alpha.style.width = value[3] * 100 + "%";
            //更新显示的颜色
            rgbValue = value.splice(0, 3);
        } else {
            rgbValue = value;
        }
        this.$color.style.backgroundColor = Chroma(rgbValue).css();
    }
}

module.exports = Color;