'use strict';

const mixin = require('../../mixin');

exports.mixins = [mixin];

exports.components = {
    'cc-number': require('./cc-number'),
};

exports.props = {
    dump: {
        type: Object,
        require: true,
    },
};

exports.data = function() {
    return {
        foldUp: false,
        paddingStyle:
            this.$attrs.indent !== undefined
                ? {
                      'padding-left': `${this.$attrs.indent * 13}px`,
                  }
                : '',
    };
};

exports.methods = {
    /**
     * 数值修改
     */
    _onChange(event) {
        const { value, path: key } = event.detail;
        this.dump.value[key] = value;
        this.dispatch('change');
    },

    _onCancel(event) {
        const { value, path: key } = event.detail;
        this.dump.value[key] = value;
        this.dispatch('change');
    },

    _onConfirm(event) {
        const { value, path: key } = event.detail;
        this.dump.value[key] = value;
        this.dispatch('change');
    },

    dispatch(type) {
        const event = new CustomEvent(type, {
            bubbles: true,
            detail: {
                value: this.dump.value,
                path: this.dump.path,
                type: this.dump.type,
            },
        });

        this.$el.dispatchEvent(event);
    },
};

exports.render = function(h) {
    return h(
        'div',
        {
            staticClass: 'ui-prop',
            class: {
                vecx: this.$attrs['auto-height'] !== false,
            },
            on: {
                ...this.$listeners,
            },
        },
        [
            h(
                'div',
                {
                    staticClass: 'wrapper',
                },
                [
                    this.dump.name !== undefined &&
                        h(
                            'div',
                            {
                                staticClass: 'label',
                                style: this.paddingStyle,
                            },
                            [
                                h('i', {
                                    staticClass: 'move',
                                }),
                                h('i', {
                                    staticClass: 'fold iconfont',
                                    class: {
                                        'icon-un-fold': !this.foldUp,
                                        foldable: this.$attrs.foldable !== undefined,
                                        'icon-fold': this.foldUp,
                                    },
                                    on: {
                                        click: ($event) => {
                                            this.foldUp = !this.foldUp;
                                        },
                                    },
                                }),
                                h(
                                    'span',
                                    {
                                        staticClass: 'text',
                                    },
                                    [this.dump.name]
                                ),
                                this.$attrs.readonly !== undefined &&
                                    h(
                                        'div',
                                        {
                                            staticClass: 'lock',
                                        },
                                        [
                                            h('i', {
                                                staticClass: 'iconfont icon-lock',
                                            }),
                                        ]
                                    ),
                            ]
                        ),
                    h(
                        'div',
                        {
                            staticClass: 'wrapper-content',
                        },
                        [
                            (this.$attrs.keys || Object.keys(this.dump.value)).map((key) => {
                                const name = key.charAt(0).toLocaleUpperCase() + key.slice(1);
                                return h('cc-number', {
                                    staticClass: 'fixed-label flex-1',
                                    attrs: {
                                        ...this.$attrs,
                                        nest: '',
                                        dump: {
                                            name,
                                            value: this.dump.value[key],
                                            path: key,
                                        },
                                    },
                                    on: {
                                        confirm: ($event) => {
                                            $event.stopPropagation();
                                            return this._onConfirm($event);
                                        },
                                        change: ($event) => {
                                            $event.stopPropagation();
                                            return this._onChange($event);
                                        },
                                        cancel: ($event) => {
                                            $event.stopPropagation();
                                            return this._onCancel($event);
                                        },
                                    },
                                });
                            }),
                            this.$slots.default && this.$slots.default,
                        ]
                    ),
                ]
            ),
            h(
                'div',
                {
                    staticClass: 'child',
                    class: { 'fold-up': this.foldUp },
                },
                [this.$slots.child && this.$slots.child]
            ),
        ]
    );
};
