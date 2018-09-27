'use strict';

const fs = require('fs');
const path = require('path');
const Base = require('../base');
let customStyle = '';
const Chroma = require('chroma-js');
const { domUtils } = require('../../utils');

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
     * @param {filePath} src
     */
    static importStyle(src) {
        if (!fs.existsSync(src)) {
            return;
        }

        // 读取 css 并设置到节点内
        customStyle = fs.readFileSync(src, 'utf8');

        // 循环已经使用的节点，设置新的 css
        instanceArray.map((elem) => {
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

        // colorPicker 供颜色选择
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

        // 绑定 color 事件
        this.addEventListener('click', this._onClick);

        // 绑定 colorPicker 事件
        this.$colorPicker.addEventListener('change', this._onColorPickerChange);
        this.$colorPicker.addEventListener('click', this._onColorPickerClick);
        this.$colorPicker.addEventListener('confirm', this._onColorPickerChange);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    disconnectedCallback() {
        // 实例移除回调
        super.disconnectedCallback();
        const index = instanceArray.indexOf(this);

        // 删除缓存的节点
        instanceArray.splice(index, 1);

        // 销毁 color 事件
        this.removeEventListener('click', this._onClick);

        // 销毁 colorPicker 事件
        this.$colorPicker.removeEventListener('change', this._onColorPickerChange);
        this.$colorPicker.removeEventListener('confirm', this._onColorPickerChange);
        this.$colorPicker.removeEventListener('click', this._onColorPickerClick);
    }

    get value() {
        const val = this.getAttribute('value');
        let value;
        try {
            value = JSON.parse(val);
        } catch (err) {
            value = val ? Chroma(val).rgba() : [255, 255, 255, 1];
        }
        return value;
    }

    set value(value) {
        let value;
        if (Array.isArray(val)) {
            value = JSON.stringify(val);
        } else {
            value = JSON.stringify(Chroma(val).rgba());
        }
        this.$colorPicker.value = value;
    }

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return ['focused', 'readonly', 'disabled', 'value'];
    }

    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr) {
            case 'value':
                this._updateColor(newValue);
                break;
        }
    }

    //////////////////////
    // 私有事件

    _onFocus() {
        super._onFocus();
        this.$colorPicker.focus();
        this._staging = Array.from(this.value);
    }

    /**
     * color 的 click 事件，点击获取初始值并显示 colorPicker
     */
    _onClick(event) {
        if (this.disabled || this.readOnly) {
            return;
        }
        this.$colorPicker.value = Array.from(this.value);
        this.$colorPicker.show();
        this.$colorPicker.focused = true;
    }

    /**
     * color 的 blur 事件
     */
    _onBlur(event) {
        super._onBlur(event);
        this.$colorPicker.hide();
        if (this.disabled || this.readOnly) {
            return;
        }
        // 判断值是否发生改变
        if (this.value.toString() === this._staging.toString()) {
            return;
        }
        this.dispatch('confirm');
    }

    /**
     * color 的键盘监听事件
     */
    _onKeyDown(event) {
        // super._onKeyDown(event);
        if (this.disabled || this.readOnly) {
            return;
        }
        switch (event.keyCode) {
            case 13:
                this.$colorPicker.hide();
                this.dispatch('change');
                this._confirmFlag = true;
                break;
            case 27: // esc
                this.setAttribute('value', JSON.stringify(this._staging));
                this.$colorPicker.hide();
                this.$colorPicker.value = this._staging;
                this.dispatch('cancel');
        }
    }

    /**
     * colorPicker 点击事件
     * 阻止冒泡到 color 上
     * @param {Event} event
     */
    _onColorPickerClick(event) {
        event.stopPropagation();
    }

    /**
     * colorPicker 的值发生改变
     */
    _onColorPickerChange(event) {
        this.$root._confirmFlag = false;
        this.$root.setAttribute('value', JSON.stringify(this.value));
        this.$root.dispatch('change');
    }

    //////////////////////////////////
    // 私有处理方法

    /**
     * 更新颜色值
     * @param {Color} value 颜色值
     */
    _updateColor(value) {
        let color;
        let rgbValue;
        value = domUtils.changeColor(value);
        if (value.length > 3) {
            this.$alpha.style.width = value[3] * 100 + '%';
            // 更新显示的颜色
            rgbValue = value.splice(0, 3);
        } else {
            rgbValue = value;
        }
        this.$color.style.backgroundColor = Chroma(rgbValue).css();
    }
}

module.exports = Color;
