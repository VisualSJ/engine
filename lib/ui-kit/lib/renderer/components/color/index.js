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

// 定义公用的 color-picker 组件与 ghost 层（避免弹出 color-picker 后的滚动）
let $colorPicker;
let $ghost;
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
        this.$alpha.$root = this.$color.$root = this;
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

        // 生成 colorPicker 供颜色选择
        if (!$colorPicker || !$ghost) {
            this._createColorPicker();
        }

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
    }

    get value() {
        const val = this.getAttribute('value');
        return domUtils.getValidColor(val);
    }

    set value(value) {
        let value = domUtils.getValidColor(val);
        $colorPicker.value = value;
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
                this._updateColor(this.value);
                break;
        }
    }

    //////////////////////
    // 私有事件

    _onFocus() {
        super._onFocus();
        $colorPicker.focus();
        this._staging = Array.from(this.value);
    }

    /**
     * color 的 click 事件，点击获取初始值并显示 colorPicker
     */
    _onClick() {
        if (this.disabled || this.readOnly) {
            return;
        }
        this._staging = Array.from(this.value);
        this._selfFocus = true;
        $colorPicker.value = Array.from(this.value);
        this._setColorPickerPos();
        // 显示 ghost 层和 color-picker
        this._showColorPicker();
        $colorPicker.focus();
    }

    // 计算设置当前 color-pciker 的最佳位置
    _setColorPickerPos() {
        let {top, left} = this.getClientRects()[0];
        let {width, height} = $colorPicker.getClientRects()[0];
        let W = window.innerWidth;
        let H = window.innerHeight;

        // 判断当前 color-picker 放置后是否会超出窗口
        if (top + height < H) {
            $colorPicker.style.top = `${top + 40}px`;
            $colorPicker.style.bottom = '';
        } else {
            $colorPicker.style.bottom = '10px'; // 预留出窗口边框的距离
            $colorPicker.style.top = ''; // 重置 top ,防止旧 top 数据对color-picker的高度造成影响
        }
        if (left + width < W) {
            $colorPicker.style.left = `${left}px`;
            $colorPicker.style.right = '';
        } else {
            $colorPicker.style.right = '10px';
            $colorPicker.style.left = '';
        }
    }

    /**
     * colorPicker 的值发生改变
     */
    _onColorPickerChange() {
        this.$root.setAttribute('value', JSON.stringify(this.value));
        this.$root.dispatch('change');
    }

    /**
     * colorPicker 的confirm事件
     */
    _onColorPickerConfirm() {
        this.$root.setAttribute('value', JSON.stringify(this.value));
        this.$root.dispatch('confirm');
    }

    // 监听 color-picker 的 blur 事件, 并传递给 color 作数据处理
    _onColorPickerBlur() {
        let $root = this.$root;
        $root._hideColorPicker();
        $root._staging = Array.from(this.value);
    }

    // 监听 color-picker 的 enter 响应事件
    _onColorPickerEnter() {
        let $root = this.$root;
        $root._hideColorPicker();
        $root._staging = Array.from(this.value);
        $root._confirm();
    }

    // 监听 color-picker 的 cancel 事件
    _onColorPickerCancel() {
        let $root = this.$root;
        $root._hideColorPicker();
        if ($root._staging && $root._staging.toString() === this.value.toString()) {
           return;
        }
        $root.setAttribute('value', JSON.stringify($root._staging));
        $colorPicker.value = $root._staging;
        $root.dispatch('change');
        $root.dispatch('cancel');
    }

    //////////////////////////////////
    // 私有处理方法

    _confirm() {
        // 判断值是否发生改变
        if (this._staging && this.value.toString() === this._staging.toString()) {
            return;
        }
        this.dispatch('confirm');
    }

    _showColorPicker() {
        $colorPicker.$root = this;
        // 绑定 colorPicker 事件
        $colorPicker.addEventListener('change', this._onColorPickerChange);
        $colorPicker.addEventListener('confirm', this._onColorPickerConfirm);
        $colorPicker.addEventListener('focusout', this._onColorPickerBlur);
        $colorPicker.addEventListener('escKey', this._onColorPickerCancel);
        $colorPicker.addEventListener('enterKey', this._onColorPickerEnter);
        $ghost.visibility = 'visible';
        $colorPicker.show();
    }

    _hideColorPicker() {
        // 销毁 colorPicker 事件
        $colorPicker.removeEventListener('change', this._onColorPickerChange);
        $colorPicker.removeEventListener('confirm', this._onColorPickerConfirm);
        $colorPicker.removeEventListener('focusout', this._onColorPickerBlur);
        $colorPicker.removeEventListener('escKey', this._onColorPickerCancel);
        $colorPicker.removeEventListener('enterKey', this._onColorPickerEnter);
        $ghost.visibility = 'hidden';
        $colorPicker.hide();
    }
    /**
     * 更新颜色值
     * @param {Color} value 颜色值
     */
    _updateColor(value) {
        let rgbValue;
        value = domUtils.getValidColor(value);
        if (value.length > 3) {
            this.$alpha.style.width = 100 * value[3] / 255 + '%';
            // 更新显示的颜色
            rgbValue = Array.from(value).splice(0, 3);
        } else {
            rgbValue = value;
        }
        this.$color.style.backgroundColor = Chroma(rgbValue).css();
    }

    // 获取 colorPicker 的 dom 元素
    _createColorPicker() {
        $colorPicker = document.createElement('ui-color-picker');
        $colorPicker.hide();
        domUtils.setStyle($colorPicker, {
            position: 'absolute',
            'z-index': '999',
        });
        $ghost = document.createElement('div');
        domUtils.setStyle($ghost, {
            position: 'absolute',
            'z-index': '20',
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            visibility: 'hidden',
        });
        document.body.appendChild($ghost);
        document.body.appendChild($colorPicker);
    }
}

module.exports = Color;
