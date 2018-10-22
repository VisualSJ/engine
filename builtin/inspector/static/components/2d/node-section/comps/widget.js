'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/widget.html');

exports.props = ['target'];

exports.components = {
    'alignment-preview': require('../public/alignment-preview')
};

exports.data = function() {
    return {};
};

exports.computed = {
    horizontalCenterValue() {
        return this.compose(
            this.target.horizontalCenter,
            this.target.isAbsoluteHorizontalCenter.value
        );
    },

    horizontalCenterValues() {
        return this.target.isAbsoluteHorizontalCenter.values.map((t) =>
            this.compose(
                this.target.horizontalCenter,
                t
            )
        );
    },

    verticalCenterValue() {
        return this.compose(
            this.target.verticalCenter,
            this.target.isAbsoluteVerticalCenter.value
        );
    },

    topValue() {
        return this.compose(
            this.target.top,
            this.target.isAbsoluteTop.value
        );
    },

    leftValue() {
        return this.compose(
            this.target.left,
            this.target.isAbsoluteLeft.value
        );
    },

    rightValue() {
        return this.compose(
            this.target.right,
            this.target.isAbsoluteRight.value
        );
    },

    bottomValue() {
        return this.compose(
            this.target.bottom,
            this.target.isAbsoluteBottom.value
        );
    }
};

exports.methods = {
    T,

    dispatch(dump) {
        const customEvent = new CustomEvent('property-changed', {
            bubbles: true,
            detail: {
                dump
            }
        });

        this.$el.dispatchEvent(customEvent);
    },

    compose(target, isAbsolute) {
        var value = target.value;
        var values = target.values;
        if (
            this.multi &&
            values.some((item) => {
                return values[0] !== item;
            })
        ) {
            return '-';
        }

        value = value || 0;
        if (!isAbsolute) {
            value *= 100;
        }
        let unit = isAbsolute ? 'px' : '%';
        // 为了不让他出现 -0
        if (value === 0) {
            value = +0;
        }
        return '' + value.toFixed(2) + unit;
    },

    decompose(value) {
        let isAbs;
        if (value.endsWith('%') || value.endsWith('％')) {
            value = value.slice(0, -1);
            isAbs = false;
        } else {
            if (value.endsWith('px')) {
                value = value.slice(0, -2);
            }
            isAbs = true;
        }
        value = value === '' ? 0 : parseFloat(value);
        if (!isAbs) {
            value /= 100;
        }
        return {
            value: value,
            isAbsolute: isAbs
        };
    },

    changeMargin(t, e, i) {
        if (this.target) {
            let n = this.decompose(t);
            if (isNaN(n.value)) {
                return console.warn(`Invalid input: ${t}`), !1;
            }
            n.value !== this.target[e].value && (this.target[e].value = n.value),
                n.isAbsolute !== this.target[i].value && (this.target[i].value = n.isAbsolute);
        }
        return !0;
    },

    changePropValue(target, flag) {
        // todo
        this.dispatch(flag);
        this.dispatch(target);
    },

    onHorizontalCenterChanged(event) {
        this.changeMargin(event.target.value, 'horizontalCenter', 'isAbsoluteHorizontalCenter');
        this.changePropValue(this.target.horizontalCenter, this.target.isAbsoluteHorizontalCenter);
    },

    onVerticalCenterChanged(event) {
        this.changeMargin(event.target.value, 'verticalCenter', 'isAbsoluteVerticalCenter');
        this.changePropValue(this.target.verticalCenter, this.target.isAbsoluteVerticalCenter);
    },

    onTopChanged(event) {
        this.changeMargin(event.target.value, 'top', 'isAbsoluteTop');
        this.changePropValue(this.target.top, this.target.isAbsoluteTop);
    },

    onLeftChanged(event) {
        this.changeMargin(event.target.value, 'left', 'isAbsoluteLeft');
        this.changePropValue(this.target.left, this.target.isAbsoluteLeft);
    },

    onRightChanged(event) {
        this.changeMargin(event.target.value, 'right', 'isAbsoluteRight');
        this.changePropValue(this.target.right, this.target.isAbsoluteRight);
    },

    onBottomChanged(event) {
        this.changeMargin(event.target.value, 'bottom', 'isAbsoluteBottom');
        this.changePropValue(this.target.bottom, this.target.isAbsoluteBottom);
    },

    onLeftRightChecked(event, dump) {
        const { value } = event.target;
        const { target } = this;

        if (value && target) {
            const { isAlignHorizontalCenter } = target;
            isAlignHorizontalCenter.value && (isAlignHorizontalCenter.value = false);
        }

        dump.value = value;
        this.dispatch(dump);
    },

    onTopBottomChecked(event, dump) {
        const { value } = event.target;
        const { target } = this;

        if (value && target) {
            const { isAlignVerticalCenter } = target;
            isAlignVerticalCenter.value && (isAlignVerticalCenter.value = false);
        }

        dump.value = value;
        this.dispatch(dump);
    },

    onHorizontalCenterChecked(event, dump) {
        const { value } = event.target;
        const { target } = this;

        if (value && target) {
            const { isAlignLeft, isAlignRight } = target;

            isAlignLeft.value && (isAlignLeft.value = false);
            isAlignRight.value && (isAlignRight.value = false);
        }

        dump.value = value;
        this.dispatch(dump);
    },

    onVerticalCenterChecked(event, dump) {
        const { value } = event.target;
        const { target } = this;

        if (value && target) {
            const { isAlignTop, isAlignBottom } = target;

            isAlignTop.value && (isAlignTop.value = false);
            isAlignBottom.value && (isAlignBottom.value = false);
        }

        dump.value = value;
        this.dispatch(dump);
    },

    checkWidgetMulti(target) {
        // todo multi
        // var values = target.values ? target.values : target;
        // var src = values[0];
        // return !values.every((item) => {
        //     return item === src;
        // });
    },

    checkWidgetInput(target, multi) {
        if (multi) {
            return target.values.every((item) => {
                return item === true;
            });
        }
        return target.value === true;
    }
};
