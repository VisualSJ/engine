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
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function (elem, detach = false) {
    const onHueCtrlDragStart = event => {
        elem.dragging = true;
        elem.oldValue = elem.value;
    };
    const onHueCtrlDragging = event => {
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
        elem.emitChange();
    };
    const onHueCtrlDragEnd = event => {
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
            elem.emitConfirm();
        }
    };
    const onColorCtrlDragStart = event => {
        elem.dragging = true;
        elem.oldValue = elem.value;
    };

    const onColorCtrlDragging = event => {
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
        elem.emitChange();
    };

    const onColorCtrlDragEnd = event => {
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
            elem.emitConfirm();
        }
    };

    const onAlphaCtrlDragStart = event => {
        elem.dragging = true;
        elem.oldValue = elem.value;
    };

    const onAlphaCtrlDragging = event => {
        const rect = elem.$alphaCtrl.getBoundingClientRect();
        const top = clamp((event.clientY - rect.top) / elem.$alphaCtrl.clientHeight, 0, 1);
        elem.$alphaCtrl.style.top = `${100 * top}%`;
        const value = elem.value;
        value[3] = parseFloat((1 - top).toFixed(3));
        !elem.type && (elem.type = 'alphaChange');
        elem.value = value;
        elem.emitChange();
    };

    const onAlphaCtrlDragEnd = event => {
        if (elem.dragging) {
            elem.dragging = false;
            const rect = elem.$alphaCtrl.getBoundingClientRect();
            const top = clamp((event.clientY - rect.top) / elem.$alphaCtrl.clientHeight, 0, 1);
            elem.$alphaCtrl.style.top = `${100 * top}%`;
            const value = elem.value;
            value[3] = parseFloat((1 - top).toFixed(3));
            !elem.type && (elem.type = 'alphaChange');
            elem.value = value;
            elem.emitConfirm();
        }
    };

    const onSliderRChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = elem.value;
        val[0] = value;
        !elem.type && (elem.type = 'rgbChange');
        elem.value = val;
        elem.emitChange();
    };

    const onSliderGChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = elem.value;
        val[1] = value;
        !elem.type && (elem.type = 'rgbChange');
        elem.value = val;
        elem.emitChange();
    };

    const onSliderBChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = elem.value;
        val[2] = value;
        !elem.type && (elem.type = 'rgbChange');
        elem.value = val;
        elem.emitChange();
    };
    const onSliderAChange = event => {
        event.stopPropagation();
        const { value = 0 } = event.detail;
        let val = elem.value;
        val[3] = value / 255;
        !elem.type && (elem.type = 'alphaChange');
        elem.value = val;
        elem.emitChange();
    };

    const onSliderConfirm = event => {
        event.stopPropagation();
        elem.emitConfirm();
    };

    const onSliderCancel = event => {
        event.stopPropagation();
        elem.emitCancel();
    };

    DomUtils.controlDragEvent(
        elem.$hueCtrl,
        {
            start: onHueCtrlDragStart,
            drag: onHueCtrlDragging,
            end: onHueCtrlDragEnd
        },
        detach
    );

    DomUtils.controlDragEvent(
        elem.$colorCtrl,
        { start: onColorCtrlDragStart, drag: onColorCtrlDragging, end: onColorCtrlDragEnd },
        detach
    );
    DomUtils.controlDragEvent(
        elem.$alphaCtrl,
        { start: onAlphaCtrlDragStart, drag: onAlphaCtrlDragging, end: onAlphaCtrlDragEnd },
        detach
    );
    if (detach) {
        elem.$sliderR.removeEventListener('change', onSliderRChange);
        elem.$sliderR.removeEventListener('confirm', onSliderConfirm);
        elem.$sliderR.removeEventListener('cancel', onSliderCancel);
        elem.$sliderG.removeEventListener('change', onSliderGChange);
        elem.$sliderG.removeEventListener('confirm', onSliderConfirm);
        elem.$sliderG.removeEventListener('cancel', onSliderCancel);
        elem.$sliderB.removeEventListener('change', onSliderBChange);
        elem.$sliderB.removeEventListener('confirm', onSliderConfirm);
        elem.$sliderB.removeEventListener('cancel', onSliderCancel);
        elem.$sliderA.removeEventListener('change', onSliderAChange);
        elem.$sliderA.removeEventListener('confirm', onSliderConfirm);
        elem.$sliderA.removeEventListener('cancel', onSliderCancel);
    } else {
        elem.$sliderR.addEventListener('change', onSliderRChange);
        elem.$sliderR.addEventListener('confirm', onSliderConfirm);
        elem.$sliderR.addEventListener('cancel', onSliderCancel);
        elem.$sliderG.addEventListener('change', onSliderGChange);
        elem.$sliderG.addEventListener('confirm', onSliderConfirm);
        elem.$sliderG.addEventListener('cancel', onSliderCancel);
        elem.$sliderB.addEventListener('change', onSliderBChange);
        elem.$sliderB.addEventListener('confirm', onSliderConfirm);
        elem.$sliderB.addEventListener('cancel', onSliderCancel);
        elem.$sliderA.addEventListener('change', onSliderAChange);
        elem.$sliderA.addEventListener('confirm', onSliderConfirm);
        elem.$sliderA.addEventListener('cancel', onSliderCancel);
    }
};
/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (elem, detach = false) {
    const onKeyDown = event => {
        switch (event.keyCode) {
            case 13:
                // DomUtils.acceptEvent(event);
                elem.hide(false);
                // elem.emitConfirm();
                break;
            case 27:
                // DomUtils.acceptEvent(event);
                elem.hide(true);
                // elem.emitCancel();
                break;
            default:
                break;
        }
    };

    const onInputFocus = event => {
        elem.$hexInput.oldValue = elem.$hexInput.value;
    };

    const onInputConfirm = event => {
        event.stopPropagation();
        const alpha = elem.value[3];
        const val = elem.$hexInput.value;
        const value = Chroma(val).rgba();
        value[3] = alpha;
        elem.type = 'colorChange';
        elem.value = value;
    };

    const onInputCancel = event => {
        event.stopPropagation();
        elem.$hexInput.value = elem.$hexInput.oldValue;
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
        elem.removeEventListener('keydown', onKeyDown);
        elem.$hexInput.removeEventListener('focus', onInputFocus);
        elem.$hexInput.removeEventListener('blur', onInputConfirm);
        elem.$hexInput.removeEventListener('keydown', onInputKeyDown);
    } else {
        elem.addEventListener('keydown', onKeyDown);
        elem.$hexInput.addEventListener('focus', onInputFocus);
        elem.$hexInput.addEventListener('blur', onInputConfirm);
        elem.$hexInput.addEventListener('keydown', onInputKeyDown);
    }
};

class ColorPicker extends Base {
    static importStyle (src) {
        // 引入外部样式
        if (fs.existsSync(src)) {
            customStyle = fs.readFileSync(src, 'utf8');
            instanceArray.map(elem => {
                const el = elem.shadowRoot.querySelector('#custom-style');
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
