'use strict';

//////////////
// 27 esc 恢复上一次记录的数据
// 32 space 无特殊响应
// 13 enter 记录数据并触发 confirm
// 38 up / 40 down: 加减 step 数据 (input focused)
// 37 left / 39 right: 加减 step 数据 (slider focused)

const fs = require('fs');
const path = require('path');

const { clamp } = require('../../utils');
const DomUtils = require('../../domUtils');
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
const controlMouseEvent = function (elem, detach = false) {
    const onDragStart = event => {
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
        elem.dispatch('change');
    };

    const onDragging = event => {
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
            elem.confirm();
            window.removeEventListener('mousemove', onDragging);
            window.removeEventListener('touchmove', onDragging);
            window.removeEventListener('mouseup', onDragEnd);
            window.removeEventListener('touchend', onDragEnd);
            window.removeEventListener('contextmenu', onDragEnd);
        }
    };

    DomUtils.controlDragEvent(
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
    constructor () {
        super();
        this.shadowRoot.innerHTML = `${STYLE}${CUSTOM_STYLE}${HTML}`;

        this.$input = this.shadowRoot.querySelector('.input');
        this.$cursor = this.shadowRoot.querySelector('.cursor');
        this.$track = this.shadowRoot.querySelector('.track');
        this.$wrapper = this.shadowRoot.querySelector('.wrapper');

        this.$input.$root = this.$cursor.$root = this.$track.$root = this.$wrapper.$root = this;
    }

    /**
     * 插入文档流
     */
    connectedCallback () {
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
            this.value = clamp(this.value, this.min, this.max);
        }
        this._staging = this.value;
        this.$input.value = this.value;
        this.$input._staging = this.value;

        // 添加监听事件
        controlMouseEvent(this);
        this.addEventListener('keydown', this._onKeyDown);
        this.$input.addEventListener('change', this._onInputChange);
        this.$input.addEventListener('confirm', this._onInputConfirm);
    }

    disconnectedCallback () {
        super.disconnectedCallback();

        // 删除缓存的节点
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);

        // 移除监听事件
        controlMouseEvent(this, true);
        this.removeEventListener('keydown', this._onKeyDown);
        this.$input.removeEventListener('change', this._onInputChange);
        this.$input.removeEventListener('confirm', this._onInputConfirm);
    }

    static get observedAttributes () {
        return ['value', 'min', 'max', 'height'];
    }

    attributeChangedCallback (attr, o, n) {
        switch (attr) {
            case 'value':
                {
                    if (this.isLockInput) {
                        this.isLockInput = false;
                        this.updateCursor();
                    } else {
                        this.updateCursorAndInput();
                    }
                }
                break;
            default:
                break;
        }
    }

    ////////////////////////////////////////////////////

    get boundingClientRect () {
        return this.$track.getBoundingClientRect();
    }

    get currentPosition () {
        return ((this.value - this.min) / (this.max - this.min)) * 100;
    }

    get autofocus () {
        return this.hasAttribute('autofocus');
    }
    set autofocus (val) {
        if (val !== null) {
            this.setAttribute('autofocus', '');
            this.focus();
        } else {
            this.removeAttribute('autofocus');
        }
    }

    get disabled () {
        return this.hasAttribute('disabled');
    }

    set disabled (val) {
        if (val !== null) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    get vertical () {
        return this.hasAttribute('vertical');
    }

    get height () {
        return this.getAttribute('height');
    }

    get value () {
        const val = this.getAttribute('value');
        let value = parseFloat(val);
        return isNaN(value) ? 0 : value;
    }

    set value (val) {
        if (this.min > this.max) {
            console.error('min should not be greater than max');
            return;
        }
        if (typeof val === 'number' && !isNaN(val)) {
            val = clamp(val, this.min, this.max);
        }
        this.setAttribute('value', val);
    }

    get min () {
        const value = parseFloat(this.getAttribute('min'));
        return isNaN(value) ? 0 : value;
    }

    set min (val) {
        this.setAttribute('min', val);
    }

    get max () {
        const value = parseFloat(this.getAttribute('max'));
        return isNaN(value) ? 100 : value;
    }

    set max (val) {
        this.setAttribute('max', val);
    }
    get step () {
        const value = parseFloat(this.getAttribute('step'));
        return isNaN(value) ? 1 : value;
    }

    set step (val) {
        this.setAttribute('step', val);
    }

    get precision () {
        let precisions = [this.min, this.max, this.step].map(item => {
            let decimal = ('' + item).split('.')[1];
            return decimal ? decimal.length : 0;
        });
        return Math.max.apply(null, precisions);
    }

    ////////////////////////////////////////////
    //私有事件

    _onInputChange() {
        this.$root.value = this.value;
        this.$root.dispatch('change');
    }

    _onInputConfirm() {
        this.$root.dispatch('confirm');
    }

    _onKeyDown(event) {
        if (this.disabled || this.readonly) {
            return;
        }
        if (event.keyCode === 27) {
            if (this.dragging) {
                DomUtils.acceptEvent(event);
                this.dragging = false;
                this.cancel();
            }
        } else if (event.keyCode === 37) {
            DomUtils.acceptEvent(event);
            if (this.readOnly) {
                return;
            }
            this.stepDown(event);
        } else if (event.keyCode === 39) {
            DomUtils.acceptEvent(event);
            if (this.readOnly) {
                return;
            }
            this.stepUp(event);
        }
    };

    positionToValue (position) {
        const pos = clamp(position, 0, 100);
        const stepLength = 100 / ((this.max - this.min) / this.step);
        const steps = Math.round(pos / stepLength);
        const value = steps * stepLength * (this.max - this.min) * 0.01 + this.min;
        return parseFloat(value.toFixed(this.precision));
    }


    onKeyUpHandler (event) {
        if (event.keyCode === 37 || event.keyCode === 39) {
            if (this.readOnly) {
                return;
            }
            DomUtils.acceptEvent(event);
            this.confirm();
        }
    }

    updateCursor () {
        const key = this.vertical ? 'bottom' : 'left';
        this.$cursor.style[key] = `${this.currentPosition}%`;
    }

    updateCursorAndInput () {
        this.updateCursor();
        this.$input.value = this.value;
    }

    confirm () {
        if (this._staging === this.value) {
            return;
        }
        this._staging = this.value;
        this.dispatch('confirm');
    }

    cancel () {
        if (this._staging === this.value) {
            return;
        }
        this.value = this._staging;
        this.dispatch('change');
        this.dispatch('cancel');
    }

    /**
     * 对input值作数据验证后，返回处理过的数据值
     */
    _parseInput () {
        if (null === this.$input.value || '' === this.$input.value.trim()) {
            this.value = this.min;
            return this.min;
        }
        const val = parseFloat(this.$input.value);
        const value = isNaN(val) ? this.$input._staging : clamp(val, this.min, this.max);
        this.value = parseFloat(value.toFixed(this.precision));
    }

    resetSize () {
        this.sliderSize = this.vertical ? this.$track.clientHeight : this.$track.clientWidth;
    }

    stepDown (event) {
        let step = this.step;
        event.shiftKey && (step *= 10);
        this.value = clamp(this.value - step, this.min, this.max);
        this.dispatch('change');
    }
    stepUp (event) {
        let step = this.step;
        event.shiftKey && (step *= 10);
        this.value = clamp(this.value + step, this.min, this.max);
        this.dispatch('change');
    }

    trackStyle () {
        this.vertical && (this.$track.style.height = this.height);
    }    
}

module.exports = Slider;
