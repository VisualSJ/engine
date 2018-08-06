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
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlMouseEvent = function (instance, detach = false) {
    const onDragStart = event => {
        if (instance.disabled || instance.readOnly) {
            return;
        }
        instance.dragging = true;
        instance.isClick = true;
        instance.resetSize();
        if (event.type === 'touchstart') {
            event.clientX = event.touches[0].clientX;
            event.clientY = event.touches[0].clientY;
        }
        const sliderOffset = instance.boundingClientRect;
        let position = 0;
        if (instance.vertical) {
            const sliderOffsetBottom = sliderOffset.bottom;
            position = ((sliderOffsetBottom - event.clientY) / instance.sliderSize) * 100;
        } else {
            const sliderOffsetLeft = sliderOffset.left;
            position = ((event.clientX - sliderOffsetLeft) / instance.sliderSize) * 100;
        }
        instance.oldValue = instance.value;
        instance.value = instance.positionToValue(position);
        instance.emitChange();
    };

    const onDragging = event => {
        if (instance.dragging) {
            instance.isClick = false;
            instance.resetSize();
            const sliderOffset = instance.boundingClientRect;
            let position = 0;
            if (event.type === 'touchmove') {
                event.clientX = event.touches[0].clientX;
                event.clientY = event.touches[0].clientY;
            }
            if (instance.vertical) {
                position = ((sliderOffset.bottom - event.clientY) / instance.sliderSize) * 100;
            } else {
                position = ((event.clientX - sliderOffset.left) / instance.sliderSize) * 100;
            }
            const value = instance.positionToValue(position);
            instance.value = value;
            instance.emitChange();
        }
    };
    const onDragEnd = () => {
        if (instance.dragging) {
            instance.dragging = false;
            instance.confirm();
            window.removeEventListener('mousemove', onDragging);
            window.removeEventListener('touchmove', onDragging);
            window.removeEventListener('mouseup', onDragEnd);
            window.removeEventListener('touchend', onDragEnd);
            window.removeEventListener('contextmenu', onDragEnd);
        }
    };

    DomUtils.controlDragEvent(
        instance.$track,
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
 * @param {Element} instance
 * @param {boolean} detach
 */
const controlKeyboardEvent = function (instance, detach = false) {
    const onInputFocus = () => {
        instance.$input.select();
        instance.$input.oldValue = instance.$input.value;
    };

    const onInputConfirm = bool => {
        if (!instance.readOnly && instance.changed) {
            instance.changed = false;
            let val = instance.parseInput();
            instance.$input.value = val;
            instance.$input.oldValue = val;
            instance.value = val;
            instance.oldValue = val;
            DomUtils.fire(instance, 'confirm', {
                bubbles: false,
                detail: {
                    value: instance.value
                }
            });
        }
    };
    const onInputCancel = bool => {
        if (!instance.readOnly && instance.changed) {
            instance.changed = false;
            if (instance.$input.oldValue !== instance.$input.value) {
                instance.$input.value = instance.$input.oldValue;
                let val = instance.parseInput();
                instance.$input.value = val;
                instance.value = val;
                instance.oldValue = val;
                DomUtils.fire(instance, 'change', {
                    bubbles: false,
                    detail: {
                        value: instance.value
                    }
                });
            }
            DomUtils.fire(instance, 'cancel', {
                bubbles: false,
                detail: {
                    value: instance.value
                }
            });
        }
    };
    const onKeyDown = event => {
        if (!instance.disabled) {
            if (event.keyCode === 27) {
                if (instance.dragging) {
                    DomUtils.acceptEvent(event);
                    instance.dragging = false;
                    instance.cancel();
                }
            } else if (event.keyCode === 37) {
                DomUtils.acceptEvent(event);
                if (instance.readOnly) {
                    return;
                }
                instance.stepDown(event);
            } else if (event.keyCode === 39) {
                DomUtils.acceptEvent(event);
                if (instance.readOnly) {
                    return;
                }
                instance.stepUp(event);
            }
        }
    };
    const onInputKeyDown = event => {
        if (instance.readOnly || instance.disabled) {
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
                instance.stepUp(event);
                break;
            case 40:
                DomUtils.acceptEvent(event);
                instance.stepDown(event);

            default:
                event.stopPropagation();
                break;
        }
    };
    if (detach) {
        instance.removeEventListener('keydown', onKeyDown);
        instance.$input.removeEventListener('keydown', onInputKeyDown);
        instance.$input.removeEventListener('focus', onInputFocus);
        instance.$input.removeEventListener('blur', onInputConfirm);
    } else {
        instance.addEventListener('keydown', onKeyDown);
        instance.$input.addEventListener('keydown', onInputKeyDown);
        instance.$input.addEventListener('focus', onInputFocus);
        instance.$input.addEventListener('blur', onInputConfirm);
    }
};

const controlCustomEvent = function (instance, detach = false) {
    const onInputChange = event => {
        const val = instance.parseInput();
        instance.isLockInput = true;
        instance.value = val;
        instance.emitChange();
    };
    if (detach) {
        instance.$input.removeEventListener('input', onInputChange, false);
    } else {
        instance.$input.addEventListener('input', onInputChange, false);
    }
};

class Slider extends Base {
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
