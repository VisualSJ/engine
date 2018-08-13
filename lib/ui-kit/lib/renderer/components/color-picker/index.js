'use strict';

const fs = require('fs');
const path = require('path');

const { clamp } = require('../../utils');
const DomUtils = require('../../domUtils');
const Base = require('../base');
const Chroma = require('chroma-js');

let customStyle = '';

const STYLE = `<style>${fs.readFileSync(
    path.join(__dirname, './color-picker.css'),
    'utf8'
)}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './color-picker.html'), 'utf8')}`;
const instanceArray = [];
/**
 * 创建shadow dom内容
 */
const createDomContent = () => `${STYLE}<style id="custom-style">${customStyle}</style>${HTML}`;
/**
 * 控制鼠标事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {
    const onHueCtrlDragStart = event => {
        instance.dragging = true;
        instance.oldValue = instance.value;
    };
    const onHueCtrlDragging = event => {
        const e = instance.value[3];
        const rect = instance.$hueCtrl.getBoundingClientRect();
        const top = clamp((event.clientY - rect.top) / instance.$hueCtrl.clientHeight, 0, 1);
        instance.$hueHandle.style.top = `${100 * top}%`;
        const l = 360 * (1 - top);
        const a = Chroma(instance.value).hsv();
        const value = Chroma(l, a[1], a[2], 'hsv').rgba();
        value[3] = e;
        instance.l = l;
        !instance.type && (instance.type = 'hueChange');
        instance.value = value;
        instance.emitChange();
    };
    const onHueCtrlDragEnd = event => {
        if (instance.dragging) {
            instance.dragging = false;
            const e = instance.value[3];
            const rect = instance.$hueCtrl.getBoundingClientRect();
            const top = clamp((event.clientY - rect.top) / instance.$hueCtrl.clientHeight, 0, 1);
            instance.$hueHandle.style.top = `${100 * top}%`;
            const l = 360 * (1 - top);
            const a = Chroma(instance.value).hsv();
            const value = Chroma(l, a[1], a[2], 'hsv').rgba();
            value[3] = e;
            instance.l = l;
            !instance.type && (instance.type = 'hueChange');
            instance.value = value;
            instance.emitConfirm();
        }
    };
    const onColorCtrlDragStart = event => {
        instance.dragging = true;
        instance.oldValue = instance.value;
    };

    const onColorCtrlDragging = event => {
        const e = 360 * (1 - parseFloat(instance.$hueHandle.style.top) / 100);
        const i = instance.value[3];
        const rect = instance.$colorCtrl.getBoundingClientRect();
        const l = clamp((event.clientX - rect.left) / instance.$colorCtrl.clientWidth, 0, 1);
        const a = clamp((event.clientY - rect.top) / instance.$colorCtrl.clientHeight, 0, 1);
        const o = a * a * (3 - 2 * a) * 255;
        const value = Chroma(e, l, 1 - a, 'hsv').rgba();
        value[3] = i;
        instance.$colorHandle.style.left = `${100 * l}%`;
        instance.$colorHandle.style.top = `${100 * a}%`;
        instance.$colorHandle.style.color = Chroma(o, o, o).hex();

        instance.value = value;
        !instance.type && (instance.type = 'colorChange');
        instance.value[3] = i;
        instance.emitChange();
    };

    const onColorCtrlDragEnd = event => {
        if (instance.dragging) {
            instance.dragging = false;
            const e = 360 * (1 - parseFloat(instance.$hueHandle.style.top) / 100);
            const i = instance.value[3];
            const rect = instance.$colorCtrl.getBoundingClientRect();
            const l = clamp((event.clientX - rect.left) / instance.$colorCtrl.clientWidth, 0, 1);
            const a = clamp((event.clientY - rect.top) / instance.$colorCtrl.clientHeight, 0, 1);
            const o = a * a * (3 - 2 * a) * 255;
            const value = Chroma(e, l, 1 - a, 'hsv').rgba();
            value[3] = i;
            instance.$colorHandle.style.left = `${100 * l}%`;
            instance.$colorHandle.style.top = `${100 * a}%`;
            instance.$colorHandle.style.color = Chroma(o, o, o).hex();

            instance.value = value;
            !instance.type && (instance.type = 'colorChange');
            instance.value[3] = i;
            instance.emitConfirm();
        }
    };

    const onAlphaCtrlDragStart = event => {
        instance.dragging = true;
        instance.oldValue = instance.value;
    };

    const onAlphaCtrlDragging = event => {
        const rect = instance.$alphaCtrl.getBoundingClientRect();
        const top = clamp((event.clientY - rect.top) / instance.$alphaCtrl.clientHeight, 0, 1);
        instance.$alphaCtrl.style.top = `${100 * top}%`;
        const value = instance.value;
        value[3] = parseFloat((1 - top).toFixed(3));
        !instance.type && (instance.type = 'alphaChange');
        instance.value = value;
        instance.emitChange();
    };

    const onAlphaCtrlDragEnd = event => {
        if (instance.dragging) {
            instance.dragging = false;
            const rect = instance.$alphaCtrl.getBoundingClientRect();
            const top = clamp((event.clientY - rect.top) / instance.$alphaCtrl.clientHeight, 0, 1);
            instance.$alphaCtrl.style.top = `${100 * top}%`;
            const value = instance.value;
            value[3] = parseFloat((1 - top).toFixed(3));
            !instance.type && (instance.type = 'alphaChange');
            instance.value = value;
            instance.emitConfirm();
        }
    };

    const onSliderRChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = instance.value;
        val[0] = value;
        !instance.type && (instance.type = 'rgbChange');
        instance.value = val;
        instance.emitChange();
    };

    const onSliderGChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = instance.value;
        val[1] = value;
        !instance.type && (instance.type = 'rgbChange');
        instance.value = val;
        instance.emitChange();
    };

    const onSliderBChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = instance.value;
        val[2] = value;
        !instance.type && (instance.type = 'rgbChange');
        instance.value = val;
        instance.emitChange();
    };
    const onSliderAChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = instance.value;
        val[3] = value / 255;
        !instance.type && (instance.type = 'alphaChange');
        instance.value = val;
        instance.emitChange();
    };

    const onSliderConfirm = event => {
        event.stopPropagation();
        instance.emitConfirm();
    };

    const onSliderCancel = event => {
        event.stopPropagation();
        instance.emitCancel();
    };

    DomUtils.controlDragEvent(
        instance.$hueCtrl,
        {
            start: onHueCtrlDragStart,
            drag: onHueCtrlDragging,
            end: onHueCtrlDragEnd
        },
        detach
    );

    DomUtils.controlDragEvent(
        instance.$colorCtrl,
        { start: onColorCtrlDragStart, drag: onColorCtrlDragging, end: onColorCtrlDragEnd },
        detach
    );
    DomUtils.controlDragEvent(
        instance.$alphaCtrl,
        { start: onAlphaCtrlDragStart, drag: onAlphaCtrlDragging, end: onAlphaCtrlDragEnd },
        detach
    );
    if (detach) {
        instance.$sliderR.removeEventListener('change', onSliderRChange);
        instance.$sliderR.removeEventListener('confirm', onSliderConfirm);
        instance.$sliderR.removeEventListener('cancel', onSliderCancel);
        instance.$sliderG.removeEventListener('change', onSliderGChange);
        instance.$sliderG.removeEventListener('confirm', onSliderConfirm);
        instance.$sliderG.removeEventListener('cancel', onSliderCancel);
        instance.$sliderB.removeEventListener('change', onSliderBChange);
        instance.$sliderB.removeEventListener('confirm', onSliderConfirm);
        instance.$sliderB.removeEventListener('cancel', onSliderCancel);
        instance.$sliderA.removeEventListener('change', onSliderAChange);
        instance.$sliderA.removeEventListener('confirm', onSliderConfirm);
        instance.$sliderA.removeEventListener('cancel', onSliderCancel);
        // instance.removeEventListener('blur', instance.emitConfirm);
    } else {
        instance.$sliderR.addEventListener('change', onSliderRChange);
        instance.$sliderR.addEventListener('confirm', onSliderConfirm);
        instance.$sliderR.addEventListener('cancel', onSliderCancel);
        instance.$sliderG.addEventListener('change', onSliderGChange);
        instance.$sliderG.addEventListener('confirm', onSliderConfirm);
        instance.$sliderG.addEventListener('cancel', onSliderCancel);
        instance.$sliderB.addEventListener('change', onSliderBChange);
        instance.$sliderB.addEventListener('confirm', onSliderConfirm);
        instance.$sliderB.addEventListener('cancel', onSliderCancel);
        instance.$sliderA.addEventListener('change', onSliderAChange);
        instance.$sliderA.addEventListener('confirm', onSliderConfirm);
        instance.$sliderA.addEventListener('cancel', onSliderCancel);
        // instance.addEventListener('blur', instance.emitConfirm);
    }
};
/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (instance, detach = false) {
    const onKeyDown = event => {
        switch (event.keyCode) {
            case 13:
                DomUtils.acceptEvent(event);
                instance.hide(false);
                break;
            case 27:
                DomUtils.acceptEvent(event);
                instance.hide(true);
                break;
            default:
                break;
        }
    };
    const onInputFocus = event => {
        instance.$hexInput.oldValue = instance.$hexInput.value;
    };
    const onInputConfirm = event => {
        event.stopPropagation();
        const alpha = instance.value[3];
        const val = instance.$hexInput.value;
        const value = Chroma(val).rgba();
        value[3] = alpha;
        instance.type = 'colorChange';
        instance.value = value;
    };
    const onInputCancel = event => {
        event.stopPropagation();
        instance.$hexInput.value = instance.$hexInput.oldValue;
    };
    const onInputKeyDown = event => {
        switch (event.keyCode) {
            case 13:
                onInputConfirm(event);
                break;
            case 27:
                onInputCancel(event);
                break;
            default:
                break;
        }
    };

    if (detach) {
        instance.removeEventListener('keydown', onKeyDown);
        instance.$hexInput.removeEventListener('focus', onInputFocus);
        instance.$hexInput.removeEventListener('blur', onInputConfirm);
        instance.$hexInput.removeEventListener('keydown', onInputKeyDown);
    } else {
        instance.addEventListener('keydown', onKeyDown);
        instance.$hexInput.addEventListener('focus', onInputFocus);
        instance.$hexInput.addEventListener('blur', onInputConfirm);
        instance.$hexInput.addEventListener('keydown', onInputKeyDown);
    }
};
class ColorPicker extends Base {
    static importStyle (src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(instance => {
                const el = instance.shadowRoot.querySelector('#custom-style');
                el && (el.innerHTML = customStyle);
            });
        }
    }

    constructor () {
        super();
        this.shadowRoot.innerHTML = createDomContent();
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
        // todo: color presets
        // this.$colorPresets = this.shadowRoot.querySelector('.color-box');
        // this.$btnAdd = this.shadowRoot.querySelector('#btn-add');
        // this.$palette = this.shadowRoot.querySelector('.palette');
        this.oldValue = this.getAttribute('value') || "black";
        this.lastAssignValue = this.oldValue;
    }
    static get observedAttributes () {
        return ['value'];
    }

    connectedCallback () {
        super.connectedCallback();
        instanceArray.push(this);
        controlMouseEvent(this);
        controlKeyboardEvent(this);
    }

    disconnectedCallback () {
        const index = instanceArray.indexOf(this);
        controlMouseEvent(this, true);
        controlKeyboardEvent(this, true);
        instanceArray.splice(index, 1);
    }

    attributeChangedCallback (attr, o, n) {
        switch (attr) {
            case 'value':
                    this.updateControl();
                break;
            default:
                break;
        }
    }

    emitConfirm () {
        DomUtils.fire(this, 'confirm', {
            bubbles: false,
            detail: {
                value: this.value
            }
        });
    }

    emitCancel () {
        DomUtils.fire(this, 'cancel', {
            bubbles: false,
            detail: {
                value: this.value
            }
        });
    }

    emitChange () {
        DomUtils.fire(this, 'change', {
            bubbles: false,
            detail: {
                value: this.value
            }
        });
    }

    hide (bool) {
        DomUtils.fire(this, 'hide', {
            bubbles: false,
            detail: {
                value: bool
            }
        });
    }

    updateControl () {
        switch (this.type) {
            case 'colorChange':
                this.updateColorDiff();
                this.updateAlpha();
                this.updateSliders();
                this.updateHexInput();
                break;
            case 'hueChange': 
                this.updateColorDiff();
                this.updateColor();
                this.updateAlpha();
                this.updateSliders();
                this.updateHexInput();
                break;
            case 'rgbChange':
                this.updateColorDiff();
                this.updateHue();
                this.updateColor();
                this.updateAlpha();
                this.updateHexInput();
                break;
            case 'alphaChange':
                this.updateColorDiff();
                this.updateAlpha();
                this.updateSliders();
                break;
            default:
                this.updateColorDiff();
                this.updateHue();
                this.updateColor();
                this.updateAlpha();
                this.updateSliders();
                this.updateHexInput();
                break;
        }
        this.type = '';
    }
    // todo: color presets
    // initPalette () {
    //     this.settings.colors.map(color => {
    //         const el = this.createColorBox(color);
    //         this.$palette.appendChild(el);
    //     });
    // }
    // createColorBox (color) {
    //     const el = document.createElement('div');
    //     const inner = document.createElement('div');

    //     el.classList.add('color-box');
    //     inner.classList.add('inner');
    //     inner.style.backgroundColor = color;
    //     el.appendChild(inner);
    //     el.addEventListener('contextmenu', event => {
    //         event.preventDefault();
    //     });
    //     el.addEventListener('mousedown', event => {
    //         event.stopPropagation();
    //     });
    //     return el;
    // }

    get value () {
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

    set value (val) {
        let value;
        if (Array.isArray(val)) {
            value = JSON.stringify(val);
        } else {
            value = JSON.stringify(Chroma(val).rgba());
        }
        this.setAttribute('value', value);
    }

    updateColorDiff () {
        this.$oldColor.style.backgroundColor = Chroma(this.lastAssignValue).css();
        this.$newColor.style.backgroundColor = Chroma(this.value).css();
    }
    updateHue () {
        const value = Chroma(this.value).hsv();
        if (isNaN(value[0])) {
            value[0] = 360;
        }
        this.$hueHandle.style.top = `${100 * (1 - value[0] / 360)}%`;
    }
    updateColor () {
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
    updateAlpha () {
        this.$alphaCtrl.style.backgroundColor = Chroma(this.value).hex();
        this.$alphaHandle.style.top = `${100 * (1 - this.value[3])}%`;
    }

    updateSliders () {
        this.$sliderR.value = this.value[0];
        this.$sliderG.value = this.value[1];
        this.$sliderB.value = this.value[2];
        this.$sliderA.value = parseInt(255 * this.value[3]);
    }
    updateHexInput () {
        this.$hexInput.value = Chroma(this.value)
            .hex()
            .toUpperCase();
    }
}

module.exports = ColorPicker;
