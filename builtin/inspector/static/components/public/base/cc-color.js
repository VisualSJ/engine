'use strict';

const mixin = require('../../mixin');

exports.mixins = [mixin];

exports.props = [
    'dump', // dump 数据
];

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

exports.mounted = function() {};

exports.methods = {
    /**
     * 向上传递修改事件
     */
    dispatch(type) {
        const event = new CustomEvent(type, {
            bubbles: true,
            detail: {
                type: this.dump.type,
                path: this.dump.path,
                value: this.dump.value,
            },
        });

        this.$el.dispatchEvent(event);
    },

    t(color) {
        return JSON.stringify([color.r, color.g, color.b, color.a]);
    },

    /**
     * 数值修改
     */
    _onChange(event) {
        const { value } = event.target;
        ['r', 'g', 'b', 'a'].map((item, index) => {
            this.dump.value[item] = value[index];
        });
        this.dispatch('change');
    },

    /**
     * 数值修改
     */
    _onConfirm(event) {
        const { value } = event.target;
        ['r', 'g', 'b', 'a'].map((item, index) => {
            this.dump.value[item] = value[index];
        });
        this.dispatch('confirm');
    },

    /**
     * 数值修改
     */
    _onCancel(event) {
        const { value } = event.target;
        ['r', 'g', 'b', 'a'].map((item, index) => {
            this.dump.value[item] = value[index];
        });
        this.dispatch('cancel');
    },
};

exports.render = function(h) {
    return h(
        'div',
        {
            staticClass: 'ui-prop',
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
                                    staticClass: 'iconfont fold',
                                    class: {
                                        'icon-un-fold': !this.foldUp,
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
                            h('ui-color', {
                                attrs: {
                                    ...this.$attrs,
                                    value: this.t(this.dump.value),
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
