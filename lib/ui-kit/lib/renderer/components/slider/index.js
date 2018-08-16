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

const STYLE = `<style>${fs.readFileSync(path.join(__dirname, './slider.css'), 'utf8')}</style>`;
const HTML = `${fs.readFileSync(path.join(__dirname, './slider.html'), 'utf8')}`;
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
        elem.oldValue = elem.value;
        elem.value = elem.positionToValue(position);
        elem.emitChange();
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
            elem.emitChange();
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

/**
 * 控制键盘事件绑定以及解绑
 * @param {Element} elem
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (elem, detach = false) {
    const onInputFocus = () => {
        elem.$input.select();
        elem.$input.oldValue = elem.$input.value;
    };

    const onInputConfirm = bool => {
        if (!elem.readOnly && elem.changed) {
            elem.changed = false;
            let val = elem.parseInput();
            elem.$input.value = val;
            elem.$input.oldValue = val;
            elem.value = val;
            elem.oldValue = val;
            DomUtils.fire(elem, 'confirm', {
                bubbles: false,
                detail: {
                    value: elem.value
                }
            });
        }
    };

    const onInputCancel = bool => {
        if (!elem.readOnly && elem.changed) {
            elem.changed = false;
            if (elem.$input.oldValue !== elem.$input.value) {
                elem.$input.value = elem.$input.oldValue;
                let val = elem.parseInput();
                elem.$input.value = val;
                elem.value = val;
                elem.oldValue = val;
                DomUtils.fire(elem, 'change', {
                    bubbles: false,
                    detail: {
                        value: elem.value
                    }
                });
            }
            DomUtils.fire(elem, 'cancel', {
                bubbles: false,
                detail: {
                    value: elem.value
                }
            });
        }
    };

    const onKeyDown = event => {
        if (!elem.disabled) {
            if (event.keyCode === 27) {
                if (elem.dragging) {
                    DomUtils.acceptEvent(event);
                    elem.dragging = false;
                    elem.cancel();
                }
            } else if (event.keyCode === 37) {
                DomUtils.acceptEvent(event);
                if (elem.readOnly) {
                    return;
                }
                elem.stepDown(event);
            } else if (event.keyCode === 39) {
                DomUtils.acceptEvent(event);
                if (elem.readOnly) {
                    return;
                }
                elem.stepUp(event);
            }
        }
    };

    const onInputKeyDown = event => {
        if (elem.readOnly || elem.disabled) {
            return;
        }
        switch (event.keyCode) {
            case 13:
                DomUtils.acceptEvent(event);
                onInputConfirm(true);
                break;
            case 27:
                DomUtils.acceptEvent(event);
                onInputCancel(true);
                break;
            case 38:
                DomUtils.acceptEvent(event);
                elem.stepUp(event);
                break;
            case 40:
                DomUtils.acceptEvent(event);
                elem.stepDown(event);

            default:
                event.stopPropagation();
                break;
        }
    };

    if (detach) {
        elem.removeEventListener('keydown', onKeyDown);
        elem.$input.removeEventListener('keydown', onInputKeyDown);
        elem.$input.removeEventListener('focus', onInputFocus);
        elem.$input.removeEventListener('blur', onInputConfirm);
    } else {
        elem.addEventListener('keydown', onKeyDown);
        elem.$input.addEventListener('keydown', onInputKeyDown);
        elem.$input.addEventListener('focus', onInputFocus);
        elem.$input.addEventListener('blur', onInputConfirm);
    }
};

const controlCustomEvent = function (elem, detach = false) {
    const onInputChange = event => {
        const val = elem.parseInput();
        elem.isLockInput = true;
        elem.value = val;
        elem.emitChange();
    };
    if (detach) {
        elem.$input.removeEventListener('input', onInputChange, false);
    } else {
        elem.$input.addEventListener('input', onInputChange, false);
    }
};

class Slider extends Base {
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
        this.$input = this.shadowRoot.querySelector('.input');
        this.$cursor = this.shadowRoot.querySelector('.cursor');
        this.$track = this.shadowRoot.querySelector('.track');
        this.$wrapper = this.shadowRoot.querySelector('.wrapper');
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

    init () {
        this.autofocus = this.getAttribute('autofocus');
        this.dragging = false;
        this.sliderSize = 1;
        this.disabled && this.$input.setAttribute('disabled', '');
        if (typeof this.value !== 'number' || isNaN(this.value)) {
            this.value = this.min;
        } else {
            this.value = clamp(this.value, this.min, this.max);
        }
        this.oldValue = this.value;
        this.$input.value = this.value;
        this.$input.oldValue = this.value;
    }

    get boundingClientRect () {
        return this.$track.getBoundingClientRect();
    }

    positionToValue (position) {
        const pos = clamp(position, 0, 100);
        const stepLength = 100 / ((this.max - this.min) / this.step);
        const steps = Math.round(pos / stepLength);
        const value = steps * stepLength * (this.max - this.min) * 0.01 + this.min;
        return parseFloat(value.toFixed(this.precision));
    }

    connectedCallback () {
        super.connectedCallback();
        instanceArray.push(this);
        this.init();
        controlMouseEvent(this);
        controlKeyboardEvent(this);
        controlCustomEvent(this);
    }

    disconnectedCallback () {
        super.disconnectedCallback();
        controlMouseEvent(this, true);
        controlKeyboardEvent(this, true);
        controlCustomEvent(this, true);
        this.$input = null;
        this.$track = null;
        this.$cursor = null;
        const index = instanceArray.indexOf(this);
        instanceArray.splice(index, 1);
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
        if (this.changed) {
            this.changed = false;
            this.oldValue = this.value;
            DomUtils.fire(this, 'confirm', {
                bubbles: false,
                detail: {
                    value: this.value
                }
            });
        }
    }

    cancel () {
        if (this.changed) {
            this.changed = false;
            this.value !== this.oldValue && (this.value = this.oldValue);
            DomUtils.fire(this, 'change', {
                bubbles: false,
                detail: {
                    value: this.value
                }
            });
        }
        DomUtils.fire(this, 'cancel', {
            bubbles: false,
            detail: {
                value: this.value
            }
        });
    }

    parseInput () {
        if (null === this.$input.value || '' === this.$input.value.trim()) {
            return this.min;
        }
        const val = parseFloat(this.$input.value);
        const value = isNaN(val) ? this.$input.oldValue : clamp(val, this.min, this.max);
        return parseFloat(value.toFixed(this.precision));
    }

    emitChange () {
        this.changed = true;
        DomUtils.fire(this, 'change', {
            bubbles: false,
            detail: {
                value: this.value
            }
        });
    }

    resetSize () {
        this.sliderSize = this.vertical ? this.$track.clientHeight : this.$track.clientWidth;
    }

    stepDown (event) {
        let step = this.step;
        event.shiftKey && (step *= 10);
        this.value = clamp(this.value - step, this.min, this.max);
        this.emitChange();
    }
    stepUp (event) {
        let step = this.step;
        event.shiftKey && (step *= 10);
        this.value = clamp(this.value + step, this.min, this.max);
        this.emitChange();
    }

    trackStyle () {
        this.vertical && (this.$track.style.height = this.height);
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
}

module.exports = Slider;
