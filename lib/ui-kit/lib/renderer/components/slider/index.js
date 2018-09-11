'use strict';

//////////////
// 27 esc 恢复上一次记录的数据
// 32 space 无特殊响应
// 13 enter 记录数据并触发 confirm
// 38 up / 40 down: 加减 step 数据 (input focused)
// 37 left / 39 right: 加减 step 数据 (slider focused)

const fs = require('fs');
const path = require('path');

const { mathUtils , domUtils } = require('../../utils');
const Base = require('../base');

let customStyle = '';
const CUSTOM_STYLE = `<style id="custom-style"></style>`;
const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './slider.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './slider.html'), 'utf8')}`;
const instanceArray = [];

/**
 * 控制鼠标事件(拖动部分)绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlMouseEvent = function(elem, detach = false) {
    const onDragStart = (event) => {
        if (elem.disabled || elem.readOnly) {
            return;
        }
        elem.dragging = true;
        elem.isClick = true;
        elem.resetSize();
        if (event.type === 'touchstart') {
            event.clientX = event.touches[0].clientX;
            event.clientY = event.touches[0].clientY;
        }
        const sliderOffset = elem.boundingClientRect;
        let position = 0;
        if (elem.vertical) {
            const sliderOffsetBottom = sliderOffset.bottom;
            position = ((sliderOffsetBottom - event.clientY) / elem.sliderSize) * 100;
        } else {
            const sliderOffsetLeft = sliderOffset.left;
            position = ((event.clientX - sliderOffsetLeft) / elem.sliderSize) * 100;
        }
        elem._staging = elem.value;
        elem.value = elem.positionToValue(position);
    };

    const onDragging = (event) => {
        if (elem.dragging) {
            elem.isClick = false;
            elem.resetSize();
            const sliderOffset = elem.boundingClientRect;
            let position = 0;
            if (event.type === 'touchmove') {
                event.clientX = event.touches[0].clientX;
                event.clientY = event.touches[0].clientY;
            }
            if (elem.vertical) {
                position = ((sliderOffset.bottom - event.clientY) / elem.sliderSize) * 100;
            } else {
                position = ((event.clientX - sliderOffset.left) / elem.sliderSize) * 100;
            }
            const value = elem.positionToValue(position);
            elem.value = value;
            elem.dispatch('change');
        }
    };

    const onDragEnd = () => {
        if (elem.dragging) {
            elem.dragging = false;
            elem.dispatch('change');
            elem._confirm();
            window.removeEventListener('mousemove', onDragging);
            window.removeEventListener('touchmove', onDragging);
            window.removeEventListener('mouseup', onDragEnd);
            window.removeEventListener('touchend', onDragEnd);
            window.removeEventListener('contextmenu', onDragEnd);
        }
    };

    domUtils.controlDragEvent(
        elem.$track,
        {
            start: onDragStart,
            drag: onDragging,
            end: onDragEnd
        },
        detach
    );
};

class Slider extends Base {
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

        this.$input = this.shadowRoot.querySelector('.input');
        this.$cursor = this.shadowRoot.querySelector('.cursor');
        this.$track = this.shadowRoot.querySelector('.track');
        this.$wrapper = this.shadowRoot.querySelector('.wrapper');
        this.$child = this.$input;
        this.$input.$root = this.$cursor.$root = this.$track.$root = this.$wrapper.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback() {
        super.connectedCallback();

        // 缓存节点
        instanceArray.push(this);

        // 初始化属性
        this.autofocus = this.getAttribute('autofocus');
        this.dragging = false;
        this.sliderSize = 1;
        this.disabled && this.$input.setAttribute('disabled', '');
        if (typeof this.value !== 'number' || isNaN(this.value)) {
            this.value = this.min;
        } else {
            this.value = mathUtils.clamp(this.value, this.min, this.max);
        }
        this.preci = parseInt(this.getAttribute('preci'), 10) || mathUtils.comPreci(this.step);
        this.min = parseFloat(this.getAttribute('min')) || 0;
        // 添加监听事件
        controlMouseEvent(this);
        this.$input.addEventListener('change', this._onInputChange);
        this.$input.addEventListener('confirm', this._onInputConfirm);
        this.$input.addEventListener('cancel', this._onInputCancel);

        // 插入自定义样式
        const $style = this.shadowRoot.querySelector('#custom-style');
        $style.innerHTML = customStyle;
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // 删除缓存的节点
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 移除监听事件
        controlMouseEvent(this, true);
        this.$input.removeEventListener('change', this._onInputChange);
        this.$input.removeEventListener('confirm', this._onInputConfirm);
        this.$input.removeEventListener('cancel', this._onInputCancel);
    }

    /**
     * 监听的 attribute 修改
     */
    static get observedAttributes() {
        return ['min', 'max', 'height', 'preci', 'step', 'value', 'readonly', 'disabled'];
    }

    attributeChangedCallback(attr, oldValue, newValue) {
        switch (attr) {
            case 'preci':
                this.preci = parseInt(newData, 10);
                break;
            case 'value':
                if (isNaN(newValue)) {
                    this.$input.value = 0;
                    break;
                }
                let value = mathUtils.clamp(newValue, this.min, this.max);
                // 判断是否超出界限
                if (value !== parseFloat(newValue)) {
                    break;
                }
                // 存在 preci 控制小数点位数
                newValue = parseFloat(newValue).toFixed(this.preci);
                // this.value = newValue;
                this.updateCursorAndInput();
                break;
            case 'step':
                this.$input.step = isNaN(newValue) ? 1 : newValue;
                break;
            case 'min':
                this.$input.min = isNaN(newValue) ? 0 : newValue;
                break;
            case 'max':
                this.$input.max = isNaN(newValue) ? 100 : newValue;
                break;
            default:
                break;
        }
    }

    ////////////////////////////////////////////////////

    get boundingClientRect() {
        return this.$track.getBoundingClientRect();
    }

    get currentPosition() {
        return ((this.value - this.min) / (this.max - this.min)) * 100;
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

    get disabled() {
        return this.hasAttribute('disabled');
    }

    set disabled(val) {
        if (val !== null) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    get vertical() {
        return this.hasAttribute('vertical');
    }

    get height() {
        return this.getAttribute('height');
    }

    get value() {
        const val = this.getAttribute('value');
        let value = parseFloat(val);
        return isNaN(value) ? 0 : value;
    }

    set value(val) {
        if (this.min > this.max) {
            console.error('min should not be greater than max');
            return;
        }
        if (typeof val === 'number' && !isNaN(val)) {
            val = mathUtils.clamp(val, this.min, this.max);
        }
        this.setAttribute('value', val);
    }

    get min() {
        const value = parseFloat(this.getAttribute('min'));
        return isNaN(value) ? 0 : value;
    }

    set min(val) {
        this.setAttribute('min', val);
    }

    get max() {
        const value = parseFloat(this.getAttribute('max'));
        return isNaN(value) ? 100 : value;
    }

    set max(val) {
        this.setAttribute('max', val);
    }

    get step() {
        const value = parseFloat(this.getAttribute('step'));
        return isNaN(value) ? 1 : value;
    }

    set step(val) {
        this.setAttribute('step', val);
    }

    set preci(val) {
        // 输入的位数为非数字或者是负数
        if (isNaN(val) || !(val >= 0) || val > 20) {
            console.warn('preci only allows numbers between 0 and 20!');
            // 默认精度与step相同
            let rang = mathUtils.comPreci(this.step);
            this.setAttribute('preci', rang);
            return;
        }
    }

    get preci() {
         // 默认精度与step相同
        return parseInt(this.getAttribute('preci'), 10) || mathUtils.comPreci(this.step);
    }

    ////////////////////////////////////////////
    //私有事件

    _onFocus() {
        super._onFocus();
        // 判断是否已按下shift键
        if (this._shiftFlag) {
            return;
        }
        this.$input.focus();
        this._staging = this.value;
    }

    /**
     * num-input的change监听事件
     */
    _onInputChange() {
        this.$root.value = this.value;
        this.$root.updateCursorAndInput();
        this.$root.dispatch('change');
    }

    /**
     * input的confirm监听事件，因为num-input内部已经对值是否改变作了处理，因而此处不需要再作验证
     */
    _onInputConfirm() {
        this.$root.dispatch('confirm');
    }

    /**
     * 监听input的cancel事件
     */
    _onInputCancel() {
        this.$root.dispatch('cancel');
    }

    /**
     * 键盘按下监听事件
     * @param {Event} event
     */
    _onKeyDown(event) {
        super._onKeyDown(event);
        if (this.disabled || this.readonly) {
            return;
        }
        if (event.keyCode === 27) { // esc 取消
            if (this.dragging) {
                domUtils.acceptEvent(event);
                this.dragging = false;
                if (this._staging === this.value) {
                    return;
                }
                this.value = this._staging;
                this.dispatch('change');
                this.dispatch('cancel');
            }
        }
    }

    /**
     * 更新位置转化为值
     * @param {*} position
     */
    positionToValue(position) {
        const pos = mathUtils.clamp(position, 0, 100);
        const stepLength = 100 / ((this.max - this.min) / this.step);
        const steps = Math.round(pos / stepLength);
        const value = steps * stepLength * (this.max - this.min) * 0.01 + this.min;
        return parseFloat(value.toFixed(this.preci));
    }

    /**
     * 更新滑块
     */
    updateCursor() {
        const key = this.vertical ? 'bottom' : 'left';
        this.$cursor.style[key] = `${this.currentPosition}%`;
    }

    /**
     * 更新滑块与Input的值
     */
    updateCursorAndInput() {
        this.updateCursor();
        this.$input.value = this.value;
    }

    /**
     * confirm事件
     */
    _confirm() {
        if (this._staging === this.value) {
            return;
        }
        this._staging = this.value;
        this.dispatch('confirm');
    }

    /**
     * 对input值作数据验证后，返回处理过的数据值
     */
    _parseInput() {
        if (null === this.$input.value || '' === this.$input.value.trim()) {
            this.value = this.min;
            return this.min;
        }
        const val = parseFloat(this.$input.value);
        const value = isNaN(val) ? this.$input._staging : mathUtils.clamp(val, this.min, this.max);
        this.value = parseFloat(value.toFixed(this.preci));
    }

    resetSize() {
        this.sliderSize = this.vertical ? this.$track.clientHeight : this.$track.clientWidth;
    }

    /**
     * 数据递减函数
     * @param {Event} event
     */
    stepDown(event) {
        let step = this.step;
        // 按下shit键可以10倍加快
        event.shiftKey && (step *= 10);
        this.value = mathUtils.clamp(this.value - step, this.min, this.max);
        this.dispatch('change');
    }

    /**
     * 数据递增函数
     * @param {Event} event
     */
    stepUp(event) {
        let step = this.step;
        // 按下shit键可以10倍加快
        event.shiftKey && (step *= 10);
        this.value = mathUtils.clamp(this.value + step, this.min, this.max);
        this.dispatch('change');
    }
}

module.exports = Slider;
