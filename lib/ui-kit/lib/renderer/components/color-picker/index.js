'use strict';

const fs = require('fs');
const path = require('path');

const { clamp , domUtils } = require('../../utils');
const Base = require('../base');
const Chroma = require('chroma-js');
const menu = require('@base/electron-menu');
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './color-picker.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './color-picker.html'), 'utf8')}`;
const instanceArray = [];
let customStyle = '';

/**
 * 添加和解绑监听事件
 * 调用外部的drag方法，实现拖到事件控制
 * 因为事件在domUtils内，而事件内需要调用当前对象只能放在外部通过此方法使用
 * @param {Element} elem
 * @param {Boolean} detach
 */
const dragContron = function(elem, detach = false) {

    // 初次进入监听事件，初始化各事件函数，并存储
    if (!detach) {
        /**
         * 存放拖拽事件的闭包函数，保证事件函数在添加和销毁时指向的是同一个
         */
        elem._dragHandles = (function(elem) {

            const onHueCtrlDragStart = (event) => {
                elem.dragging = true;
                elem.oldValue = elem.value;
            };

            const onHueCtrlDragging = (event) => {
                const e = elem.value[3];
                const rect = elem.$hueCtrl.getBoundingClientRect();
                const top = clamp((event.clientY - rect.top) / elem.$hueCtrl.clientHeight, 0, 1);
                elem.$hueHandle.style.top = `${100 * top}%`;
                const l = 360 * (1 - top);
                const a = Chroma(elem.value).hsv();
                const value = Chroma(l, a[1], a[2], 'hsv').rgba();
                value[3] = e;
                elem.l = l;
                !elem.type && (elem.type = 'hueChange');
                elem.value = value;
                elem._change();
            };

            const onHueCtrlDragEnd = (event) => {
                if (elem.dragging) {
                    elem.dragging = false;
                    const e = elem.value[3];
                    const rect = elem.$hueCtrl.getBoundingClientRect();
                    const top = clamp((event.clientY - rect.top) / elem.$hueCtrl.clientHeight, 0, 1);
                    elem.$hueHandle.style.top = `${100 * top}%`;
                    const l = 360 * (1 - top);
                    const a = Chroma(elem.value).hsv();
                    const value = Chroma(l, a[1], a[2], 'hsv').rgba();
                    value[3] = e;
                    elem.l = l;
                    !elem.type && (elem.type = 'hueChange');
                    elem.value = value;
                    elem._confirm();
                }
            };

            const onColorCtrlDragStart = (event) => {
                elem.dragging = true;
                elem.oldValue = elem.value;
            };

            const onColorCtrlDragging = (event) => {
                const e = 360 * (1 - parseFloat(elem.$hueHandle.style.top) / 100);
                const i = elem.value[3];
                const rect = elem.$colorCtrl.getBoundingClientRect();
                const l = clamp((event.clientX - rect.left) / elem.$colorCtrl.clientWidth, 0, 1);
                const a = clamp((event.clientY - rect.top) / elem.$colorCtrl.clientHeight, 0, 1);
                const o = a * a * (3 - 2 * a) * 255;
                const value = Chroma(e, l, 1 - a, 'hsv').rgba();
                value[3] = i;
                elem.$colorHandle.style.left = `${100 * l}%`;
                elem.$colorHandle.style.top = `${100 * a}%`;
                elem.$colorHandle.style.color = Chroma(o, o, o).hex();

                elem.value = value;
                !elem.type && (elem.type = 'colorChange');
                elem.value[3] = i;
                elem._change();
            };

            const onColorCtrlDragEnd = (event) => {
                if (elem.dragging) {
                    elem.dragging = false;
                    const e = 360 * (1 - parseFloat(elem.$hueHandle.style.top) / 100);
                    const i = elem.value[3];
                    const rect = elem.$colorCtrl.getBoundingClientRect();
                    const l = clamp((event.clientX - rect.left) / elem.$colorCtrl.clientWidth, 0, 1);
                    const a = clamp((event.clientY - rect.top) / elem.$colorCtrl.clientHeight, 0, 1);
                    const o = a * a * (3 - 2 * a) * 255;
                    const value = Chroma(e, l, 1 - a, 'hsv').rgba();
                    value[3] = i;
                    elem.$colorHandle.style.left = `${100 * l}%`;
                    elem.$colorHandle.style.top = `${100 * a}%`;
                    elem.$colorHandle.style.color = Chroma(o, o, o).hex();

                    elem.value = value;
                    !elem.type && (elem.type = 'colorChange');
                    elem.value[3] = i;
                    elem._confirm();
                }
            };

            const onAlphaCtrlDragStart = (event) => {
                elem.dragging = true;
                elem.oldValue = elem.value;
            };

            const onAlphaCtrlDragging = (event) => {
                const rect = elem.$alphaCtrl.getBoundingClientRect();
                const top = clamp((event.clientY - rect.top) / elem.$alphaCtrl.clientHeight, 0, 1);
                elem.$alphaCtrl.style.top = `${100 * top}%`;
                const value = elem.value;
                value[3] = parseFloat((1 - top).toFixed(3));
                !elem.type && (elem.type = 'alphaChange');
                elem.value = value;
                elem._change();
            };

            const onAlphaCtrlDragEnd = (event) => {
                if (elem.dragging) {
                    elem.dragging = false;
                    const rect = elem.$alphaCtrl.getBoundingClientRect();
                    const top = clamp((event.clientY - rect.top) / elem.$alphaCtrl.clientHeight, 0, 1);
                    elem.$alphaCtrl.style.top = `${100 * top}%`;
                    const value = elem.value;
                    value[3] = parseFloat((1 - top).toFixed(3));
                    !elem.type && (elem.type = 'alphaChange');
                    elem.value = value;
                    elem._confirm();
                }
            };

            return {
                onHueCtrlDragStart,
                onHueCtrlDragging,
                onHueCtrlDragEnd,
                onColorCtrlDragStart,
                onColorCtrlDragging,
                onColorCtrlDragEnd,
                onAlphaCtrlDragStart,
                onAlphaCtrlDragging,
                onAlphaCtrlDragEnd
            };
        })(elem);
    }

    /////////////////////////////////////////////////////////
    // 调用DomUtil的方法，传入对应的事件方法

    domUtils.controlDragEvent(
        elem.$hueCtrl,
        {
            start: elem._dragHandles.onHueCtrlDragStart,
            drag: elem._dragHandles.onHueCtrlDragging,
            end: elem._dragHandles.onHueCtrlDragEnd
        },
        detach
    );

    domUtils.controlDragEvent(
        elem.$colorCtrl,
        {
            start: elem._dragHandles.onColorCtrlDragStart,
            drag: elem._dragHandles.onColorCtrlDragging,
            end: elem._dragHandles.onColorCtrlDragEnd
        },
        detach
    );

    domUtils.controlDragEvent(
        elem.$alphaCtrl,
        {
            start: elem._dragHandles.onAlphaCtrlDragStart,
            drag: elem._dragHandles.onAlphaCtrlDragging,
            end: elem._dragHandles.onAlphaCtrlDragEnd
        },
        detach
    );

    if (detach) {
        delete elem._dragHandles;
    }
};

class ColorPicker extends Base {

    /**
     * 使用第三方提供的样式显示当前的元素
     * @param {String} src
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

    constructor() {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;

        // 初始化相关控制元素
        this.$hueHandle = this.shadowRoot.querySelector('.hue-handle');
        this.$colorHandle = this.shadowRoot.querySelector('.color-handle');
        this.$alphaHandle = this.shadowRoot.querySelector('.alpha-handle');

        this.$hueCtrl = this.shadowRoot.querySelector('.hue.ctrl');
        this.$colorCtrl = this.shadowRoot.querySelector('.color.ctrl');
        this.$alphaCtrl = this.shadowRoot.querySelector('.alpha.ctrl');

        this.$sliderR = this.shadowRoot.querySelector('#r-slider');
        this.$sliderG = this.shadowRoot.querySelector('#g-slider');
        this.$sliderB = this.shadowRoot.querySelector('#b-slider');
        this.$sliderA = this.shadowRoot.querySelector('#a-slider');

        this.$newColor = this.shadowRoot.querySelector('#new-color');
        this.$oldColor = this.shadowRoot.querySelector('#old-color');
        this.$hexInput = this.shadowRoot.querySelector('#hex-input');
        this.$btnAdd = this.shadowRoot.querySelector('.add-presets');
        this.$palette = this.shadowRoot.querySelector('.palette');

        // 给各各控制元素绑定this对象，方便在事件函数内调用
        this.$hueHandle.$root = this.$colorHandle.$root = this.$alphaHandle.$root = this.$btnAdd.$root
                              = this.$hueCtrl.$root = this.$colorCtrl.$root = this.$alphaCtrl.$root
                              = this.$palette.$root = this;
        this.$sliderR.$root = this.$sliderG.$root = this.$sliderA.$root = this.$sliderB.$root
                            = this.$newColor.$root = this.$oldColor.$root = this.$hexInput.$root
                            = domUtils.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存节点
        instanceArray.push(this);

        // 初始化属性
        this.oldValue = this.getAttribute('value') || 'black';
        this.lastAssignValue = this.oldValue;
        // 初始化获取color presets数据
        if (localStorage.getItem('colorPresets')) {
            this._colorPresets = JSON.parse(localStorage.getItem('colorPresets'));
            this._initColorPresets();
        } else {
            this._colorPresets = [];
        }

        // 对各子控件绑定事件
        dragContron(this, false);

        this.$sliderR.addEventListener('change', this._onSliderRChange);
        this.$sliderR.addEventListener('confirm', this._onSliderConfirm);
        this.$sliderR.addEventListener('cancel', this._onSliderCancel);

        this.$sliderG.addEventListener('change', this._onSliderGChange);
        this.$sliderG.addEventListener('confirm', this._onSliderConfirm);
        this.$sliderG.addEventListener('cancel', this._onSliderCancel);

        this.$sliderB.addEventListener('change', this._onSliderBChange);
        this.$sliderB.addEventListener('confirm', this._onSliderConfirm);
        this.$sliderB.addEventListener('cancel', this._onSliderCancel);

        this.$sliderA.addEventListener('change', this._onSliderAChange);
        this.$sliderA.addEventListener('confirm', this._onSliderConfirm);
        this.$sliderA.addEventListener('cancel', this._onSliderCancel);

        this.$hexInput.addEventListener('focus', this._onInputFocus);
        this.$hexInput.addEventListener('blur', this._onInputBlur);
        this.$hexInput.addEventListener('keydown', this._onInputKeyDown);

        this.$btnAdd.addEventListener('click', this._onAddClick);
        this.$palette.addEventListener('click', this._onPaletteClick);
        this.$palette.addEventListener('contextmenu', this._palettePopuMenu);

         // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    /**
     * 实例移除回调
     */
    disconnectedCallback() {
        const index = instanceArray.indexOf(this);

        // 删除缓存的节点
        instanceArray.splice(index, 1);

        // 对各子控件解绑事件
        dragContron(this, true);

        this.$sliderR.removeEventListener('change', this._onSliderRChange);
        this.$sliderR.removeEventListener('confirm', this._onSliderConfirm);
        this.$sliderR.removeEventListener('cancel', this._onSliderCancel);

        this.$sliderG.removeEventListener('change', this._onSliderGChange);
        this.$sliderG.removeEventListener('confirm', this._onSliderConfirm);
        this.$sliderG.removeEventListener('cancel', this._onSliderCancel);

        this.$sliderB.removeEventListener('change', this._onSliderBChange);
        this.$sliderB.removeEventListener('confirm', this._onSliderConfirm);
        this.$sliderB.removeEventListener('cancel', this._onSliderCancel);

        this.$sliderA.removeEventListener('change', this._onSliderAChange);
        this.$sliderA.removeEventListener('confirm', this._onSliderConfirm);
        this.$sliderA.removeEventListener('cancel', this._onSliderCancel);

        this.$hexInput.removeEventListener('focus', this._onInputFocus);
        this.$hexInput.removeEventListener('blur', this._onInputBlur);
        this.$hexInput.removeEventListener('keydown', this._onInputKeyDown);

        this.$btnAdd.removeEventListener('click', this._onAddClick);
        this.$palette.removeEventListener('click', this._onPaletteClick);
        this.$palette.removeEventListener('contextmenu', this._palettePopuMenu);
    }

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return ['focused', 'readonly', 'disabled', 'value'];
    }

    attributeChangedCallback(attr, o, n) {
        switch (attr) {
            case 'value':
                    this._updateControl();
                    break;
            default:
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
        }
        return value;
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

    ////////////////////////////////////////
    // 对外公开接口

    /**
     * 控制colorPicker的显示
     * 每次显示需要做colorPresets的初始化工作，以保持该内容可以实时同步
     */
    show() {
        // 初始化获取color presets数据
        if (localStorage.getItem('colorPresets')) {
            this._colorPresets = JSON.parse(localStorage.getItem('colorPresets'));
            this._initColorPresets();
        } else {
            this._colorPresets = [];
        }
        this.style.display = 'block';
    }

    /**
     * 控制colorPicker的隐藏
     * 为保证显示隐藏方式的一致性，也公开hide方法供外部调用
     */
    hide() {
        this.style.display = 'none';
    }

    ///////////////////////////////////////
    // 私有事件处理

    _onFocus() {
        super._onFocus();
        this._staging = Array.from(this.value);
        this._changeStage = Array.from(this.value);
    }

    /**
     * colorPicker的键盘事件
     * @param {Event} event
     */
    _onKeyDown(event) {
        switch (event.keyCode) {
            case 13: // 回车
                this.dragging = false;
                this._confirm();
                this._staging = Array.from(this.value);
                break;
            case 27: // esc
                if (this._staging.toString() === this.value.toString()) { // 先判断值是否发生更改
                    break;
                }
                this.value = Array.from(this._staging);
                this.dragging = false;
                this._change();
                this.dispatch('cancel');
                break;
        }
    }

    //////////////////////////////////////////
    // colorPresets相关事件处理

    // 获取本地存储的colorPresets信息，进行初始化
    _initColorPresets() {
        this.$palette.innerHTML = '';
        this._colorPresets.map((color, index) => {
            const elem = this._createColorBox(color);
            // 遍历初始化的同时，需要在dom上记录index值方便后续处理
            elem.colorIndex = index;
            this.$palette.appendChild(elem);
        });
    }

    /**
     * 根据传入的颜色，生成颜色格子标签，并返回该dom元素
     * @param {String} color 需要是能直接作为css的颜色值，使用该函数前需要做好数据处理
     */
    _createColorBox(color) {
        const elem = document.createElement('div');
        elem.style.backgroundColor = color;
        return elem;
    }

    /**
     * 点击colorPresets的添加按钮，添加当前颜色并记录在本地
     */
    _onAddClick() {
        let color = `rgba(${this.$root.value.toString()})`;
        this.$root._colorPresets.push(color);
        const elem = this.$root._createColorBox(color);
        elem.colorIndex = this.$root._colorPresets.length;
        this.$root.$palette.appendChild(elem);
        localStorage.setItem('colorPresets', JSON.stringify(this.$root._colorPresets));
    }

    /**
     * 点击colorPresets内的颜色格子,将当前颜色替换为该颜色
     * @param {Event} event
     */
    _onPaletteClick(event) {
        let color = Chroma(event.target.style.backgroundColor);
        this.$root.value = color.rgba();
        this.$root.type = 'rgbChange';
        this.$root._confirm();
    }

    /**
     * 右键点击colorPresets内的颜色格子，右键弹出palette的颜色处理菜单
     * @param {Event} event
     */
    _palettePopuMenu(event) {
        let $target = event.target;
        let $root = this.$root;
        let colorIndex = $target.colorIndex;
        let color = `rgba(${this.$root.value.toString()})`;
        menu.popup({
            x: event.pageX,
            y: event.pageY,
            menu: [
                {
                    label: 'replace',
                    click() {
                        $target.style.backgroundColor = color;
                        $root._colorPresets[colorIndex] = color;
                        localStorage.setItem('colorPresets', JSON.stringify($root._colorPresets));
                    }
                },
                {
                    label: 'delete',
                    click() {
                        $root.$palette.removeChild($target);
                        $root._colorPresets.splice(colorIndex, 1);
                        localStorage.setItem('colorPresets', JSON.stringify($root._colorPresets));
                    }
                }
            ]
        });
    }

    ////////////////////////////////////////////////////
    // Hex Color 输入框的相关事件函数

    /**
     * 聚焦color输入框事件
     * 获取当前值并存储，以便后续cancel时取值
     * @param {Event} event
     */
    _onInputFocus(event) {
        this.oldValue = this.value;
    }

    /**
     * input 的blur事件
     * 因为是用户输入的值，需要做数据验证，确认是正确的颜色值
     * @param {Event} event
     */
    _onInputBlur(event) {
        event.stopPropagation();
        // 调用验证16进制颜色值函数，非正确颜色值则恢复原值
        if (this.$root._checkColor(this.value)) {
            this.$root._onInputConfirm();
        } else {
            this.value = this.oldValue;
        }
    }

    /**
     * input获取正确值后更新颜色值
     * @param {Event} event
     */
    _onInputConfirm(event) {
        const alpha = this.value[3];
        const val = this.$hexInput.value;
        const value = Chroma(val).rgba();
        value[3] = alpha;
        this.type = 'colorChange';
        this.value = value;
    }

    /**
     * hex颜色输入后的cancel事件
     * @param {Event} event
     */
    _onInputCancel(event) {
        event.stopPropagation();
        this.value = this.oldValue;
    }

    /**
     * input键盘监听事件
     * @param {Event} event
     */
    _onInputKeyDown(event) {
        switch (event.keyCode) {
            case 13:
                this.$root._onInputConfirm(event);
                break;
            case 27:
                this.$root._onInputCancel(event);
                break;
            default:
                break;
        }
    }

    /**
     * R颜色变化
     * @param {Event} event
     */
    _onSliderRChange(event) {
        event.stopPropagation();
        const value = this.$root.value;
        !this.$root.type && (this.$root.type = 'rgbChange');
        value[0] = this.value;
        this.$root.value = value;
        this.$root._change();
    }

    /**
     * G颜色变化
     * @param {Event} event
     */
    _onSliderGChange(event) {
        event.stopPropagation();
        const value = this.$root.value;
        !this.$root.type && (this.$root.type = 'rgbChange');
        value[1] = this.value;
        this.$root.value = value;
        this.$root._change();
    }

    /**
     * B颜色变化
     * @param {Event} event
     */
    _onSliderBChange(event) {
        event.stopPropagation();
        const value = this.$root.value;
        !this.$root.type && (this.$root.type = 'rgbChange');
        value[2] = this.value;
        this.$root.value = value;
        this.$root._change();
    }

    /**
     * 透明度变化
     * @param {Event} event
     */
    _onSliderAChange(event) {
        event.stopPropagation();
        !this.$root.type && (this.$root.type = 'alphaChange');
        const value = this.$root.value;
        value[3] = this.value / 255;
        this.$root.value = value;
        this.$root._change();
    }

    /**
     * slider的确认事件
     * @param {Event} event
     */
    _onSliderConfirm(event) {
        event.stopPropagation();
        this.$root._confirm();
    }

    /**
     * slider的取消事件
     * @param {Event} event
     */
    _onSliderCancel(event) {
        event.stopPropagation();
        this.$root.dispatch('cancel');
    }

    //////////////////////////////////////
    // 私有方法

    /**
     * 验证颜色值
     */
    _checkColor(value) {
        let colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        let flag = colorPattern.test(value);
        return flag;
    }

    ////////////////////////////////////
    // 私有方法 更新颜色

    _updateControl() {
        switch (this.type) {
            case 'colorChange':
                this._updateColorDiff();
                this._updateAlpha();
                this._updateSliders();
                this._updateHexInput();
                break;
            case 'hueChange':
                this._updateColorDiff();
                this._updateColor();
                this._updateAlpha();
                this._updateSliders();
                this._updateHexInput();
                break;
            case 'rgbChange':
                this._updateColorDiff();
                this._updateHue();
                this._updateColor();
                this._updateAlpha();
                this._updateHexInput();
                break;
            case 'alphaChange':
                this._updateColorDiff();
                this._updateAlpha();
                this._updateSliders();
                break;
            default:
                this._updateColorDiff();
                this._updateHue();
                this._updateColor();
                this._updateAlpha();
                this._updateSliders();
                this._updateHexInput();
                break;
        }
        this.type = '';
    }

    _updateColorDiff() {
        this.lastAssignValue = this.lastAssignValue || 'red';
        this.$oldColor.style.backgroundColor = Chroma(this.lastAssignValue).css();
        this.$newColor.style.backgroundColor = Chroma(this.value).css();
    }

    _updateHue() {
        const value = Chroma(this.value).hsv();
        if (isNaN(value[0])) {
            value[0] = 360;
        }
        this.$hueHandle.style.top = `${100 * (1 - value[0] / 360)}%`;
    }

    _updateColor() {
        const val = this.l;
        const value = Chroma(this.value).hsv();
        if (isNaN(value[0])) {
            value[0] = 360;
        }
        let i = val === undefined ? value[0] : val;
        const s = value[1];
        const l = value[2];
        const a = 1 - l;
        const o = a * a * (3 - 2 * a) * 255;
        this.$colorCtrl.style.backgroundColor = Chroma(i, 1, 1, 'hsv').hex();
        this.$colorHandle.style.left = `${100 * s}%`;
        this.$colorHandle.style.top = `${100 * (1 - l)}%`;
        this.$colorHandle.style.color = Chroma(o, o, o).hex();
        this.l = undefined;
    }

    // 更新Alpha值
    _updateAlpha() {
        this.$alphaCtrl.style.backgroundColor = Chroma(this.value).hex();
        this.$alphaHandle.style.top = `${100 * (1 - this.value[3])}%`;
    }

    _updateSliders() {
        this.$sliderR.value = this.value[0];
        this.$sliderG.value = this.value[1];
        this.$sliderB.value = this.value[2];
        // ts@ignore
        this.$sliderA.value = parseInt(255 * this.value[3], 10);
    }

    _updateHexInput() {
        this.$hexInput.value = Chroma(this.value)
            .hex()
            .toUpperCase();
    }

    /**
     * 触发change事件，在此之前
     */
    _change() {
        if (this._changeStage.toString() === this.value.toString()) {
            return;
        }
        this.dispatch('change');
        this._changeStage = Array.from(this.value);
    }

    _confirm() {
        if (this._staging.toString() === this.value.toString()) {
            return;
        }
        this.dispatch('confirm');
        this._staging =  Array.from(this.value);
    }
}

module.exports = ColorPicker;
