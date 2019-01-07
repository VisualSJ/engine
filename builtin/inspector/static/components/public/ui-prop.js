'use strict';
const { readdirSync } = require('fs');
const { join, basename, extname } = require('path');

const basePath = join(__dirname, './base');

exports.components = readdirSync(basePath, {
    encoding: 'utf8',
}).reduce((prev, next) => {
    const key = basename(next, extname(next));
    prev[key] = require(join(basePath, next));
    return prev;
}, {});

exports.renderTypes = [
    'cc-vec3',
    'cc-vec2',
    'cc-size',
    'cc-rect',
    'cc-color',
    'cc-dragable',
    'boolean',
    'enum',
    'number',
    'string',
].concat(Object.keys(exports.components));

exports.props = {
    dump: {
        type: Object,
    },
    path: {
        type: String,
    },
    compType: {
        type: String,
    },
    name: {
        type: String,
    },
    value: [String, Number, Boolean, Object],
};

exports.computed = {
    label() {
        if (this.name !== undefined) {
            return this.name;
        }
        if (this.dump && this.dump.name !== undefined) {
            return this.dump.name;
        }
    },

    comp() {
        if (this.dump) {
            return this.dump;
        }
        const { path, value } = this;
        if (path && value !== undefined) {
            return {
                path,
                value,
            };
        }
    },
};

exports.data = function() {
    return {
        foldUp: false,
        paddingStyle:
            this.$attrs.indent !== undefined
                ? {
                      'padding-left': `${this.indent * 13}px`,
                  }
                : '',
    };
};

exports.methods = {
    getRenderResult(createElement) {
        const { comp, label, compType } = this;

        const slots = Object.keys(this.$slots).reduce((acc, cur) => {
            return acc.concat(
                cur === 'default'
                    ? this.$slots[cur]
                    : this.$slots[cur].map((item) =>
                          createElement(
                              'template',
                              {
                                  slot: cur,
                              },
                              [item]
                          )
                      )
            );
        }, []);

        switch (compType) {
            case 'cc-vec2':
            case 'cc-vec3':
            case 'cc-size':
            case 'cc-rect': {
                return createElement(
                    'cc-vecx',
                    {
                        attrs: {
                            'auto-height': compType === 'cc-rect',
                            ...this.$attrs,
                            dump: { ...comp, name: label },
                        },
                        on: {
                            ...this.$listeners,
                        },
                    },
                    slots
                );
            }

            case 'cc-color': {
                return createElement('cc-color', {
                    attrs: {
                        ...this.$attrs,
                        dump: { ...comp, name: label },
                    },
                    on: {
                        ...this.$listeners,
                    },
                    slots,
                });
            }

            case 'cc-dragable': {
                return createElement('cc-dragable', {
                    attrs: {
                        ...this.$attrs,
                        dump: { ...comp, name: label },
                    },
                    on: {
                        ...this.$listeners,
                    },
                    slots,
                });
            }

            case 'boolean': {
                return createElement('cc-boolean', {
                    attrs: {
                        ...this.$attrs,
                        dump: { ...comp, name: label },
                    },
                    on: {
                        ...this.$listeners,
                    },
                    slots,
                });
            }

            case 'enum': {
                return createElement(
                    'cc-enum',
                    {
                        attrs: {
                            ...this.$attrs,
                            dump: { ...comp, name: label },
                        },
                        on: {
                            ...this.$listeners,
                        },
                    },
                    // this.$slots.default
                    slots
                );
            }

            case 'number': {
                return createElement(
                    'cc-number',
                    {
                        attrs: {
                            ...this.$attrs,
                            dump: { ...comp, name: label },
                        },
                        on: {
                            ...this.$listeners,
                        },
                    },
                    slots
                );
            }
            case 'string': {
                return createElement(
                    'cc-string',
                    {
                        attrs: {
                            ...this.$attrs,
                            dump: { ...comp, name: label },
                        },
                        on: {
                            ...this.$listeners,
                        },
                    },
                    slots
                );
            }
            default:
                return createElement(
                    compType,
                    {
                        props: {
                            ...this.$props,
                        },
                        attrs: {
                            ...this.$attrs,
                        },
                        on: {
                            ...this.$listeners,
                        },
                    },
                    slots
                );
        }
    },
};

exports.render = function(h) {
    if (this.compType) {
        return this.getRenderResult(h);
    }
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
                    this.label !== undefined &&
                        h(
                            'div',
                            {
                                staticClass: 'label',
                            },
                            [
                                h('i', {
                                    staticClass: 'move',
                                }),
                                h('i', {
                                    staticClass: 'iconfont fold',
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
                                        style: this.paddingStyle,
                                    },
                                    [this.label]
                                ),
                                this.$attrs.readonly &&
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
                        this.$slots.default && this.$slots.default
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
