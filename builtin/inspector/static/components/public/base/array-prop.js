'use strict';

const { T } = require('../../../utils');

exports.props = {
    dump: {
        type: Object,
        require: true,
    },
    indent: {
        type: Number,
        default: 0,
    },
};

exports.components = {
    'ui-prop': require('../ui-prop'),
};

exports.methods = {
    arraySizeChanged(event) {
        const { value } = event.target;
        if (value < this.dump.value.length) {
            const arr = Array.from({ length: value });
            for (let i = 0; i < value; i++) {
                arr[i] = this.dump.value[i];
            }
            this.dump.value = arr;
        } else {
            this.dump.value.length = value;
        }

        const customEvent = new CustomEvent('change', {
            bubbles: true,
            detail: {
                type: 'Array',
                path: `${this.dump.path}.length`,
                value,
            },
        });

        this.$el.dispatchEvent(customEvent);
    },
};

exports.render = function(h) {
    const {dump} = this;
    return h('ui-prop', {
        attrs: {
            foldable: '',
            name: dump.name,
            indent: this.indent,
        },
        on: {
            ...this.$listeners,
        },
    }, !dump.values || dump.values.length <= 1 ? [h('ui-num-input', {
            staticClass: 'flex-1',
            attrs: {
                readonly: dump.attrs && dump.attrs.readonly,
                ...this.$attrs,
                min: 0,
                max: 100,
                value: dump.value.length,
            },
            on: {
                confirm: ($event) => {
                    $event.stopPropagation();
                    this.arraySizeChanged($event);
                },
            },
        }), h('template', {
            slot: 'child',
        }, [
            dump.value.map((prop, index) => h('ui-prop', {
                key: index,
                attrs: {
                    'comp-type': prop.compType,
                    dump: prop,
                    indent: +this.indent + 1,
                },
            })),
        ])] : h('span', 'difference')
    );
};
