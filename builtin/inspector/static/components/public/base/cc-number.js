'use strict';

const mixin = require('../../mixin');

exports.mixins = [mixin];

exports.props = {
    dump: {
        type: Object,
        require: true,
    },
    slidable: {
        type: Boolean,
        default: true,
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

exports.mounted = function() {
    this.initEvents();
};

exports.methods = {
    /**
     * 向上传递修改事件
     */
    dispatch(type, value) {
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

    /**
     * 数值修改
     */
    _onChange(event) {
        const { value } = event.target;
        this.dump.value = value;
        this.dispatch('change', value);
    },

    /**
     * 数值修改
     */
    _onConfirm(event) {
        const { value } = event.target;
        // this.dump.value = value;
        this.dispatch('confirm', value);
    },

    /**
     * 数值修改
     */
    _onCancel(event) {
        const { value } = event.target;
        // this.dump.value = value;
        this.dispatch('cancel', value);
    },

    _onMouseDown(event) {
        // event.preventDefault();
        event.stopPropagation();
        if (this.disabled) {
            return;
        }
        if (this.slidable) {
            if (this.readonly) {
                this._onSlideStart('ew-resize', event);
            } else {
                this._sliding = true;
                this.$el.dispatchEvent(
                    new CustomEvent('slide-start', {
                        bubbles: false,
                    })
                );

                this._onSlideStart(
                    'ew-resize',
                    event,
                    (event) => {
                        this.$el.dispatchEvent(
                            new CustomEvent('slide-change', {
                                bubbles: false,
                                detail: {
                                    dx: event.movementX,
                                    dy: event.movementY,
                                },
                            })
                        );
                    },
                    () => {
                        this.$el.dispatchEvent(
                            new CustomEvent('slide-confirm', {
                                bubbles: false,
                            })
                        );
                    }
                );
            }
        }
    },

    _onKeyDown(event) {},

    _addDragLayer(type) {
        if (!this._dragLayer) {
            this._dragLayer = document.createElement('div');
            this._dragLayer.classList.add('drag-layer');
            this._dragLayer.style.position = 'absolute';
            this._dragLayer.style.top = '0';
            this._dragLayer.style.bottom = '0';
            this._dragLayer.style.right = '0';
            this._dragLayer.style.left = '0';
            this._dragLayer.oncontextmenu = () => {
                return false;
            };
        }
        this._dragLayer.style.cursor = type;
        document.body.appendChild(this._dragLayer);
    },

    _removeDragLayer() {
        if (this._dragLayer) {
            this._dragLayer.style.cursor = 'auto';
            this._dragLayer.parentElement && this._dragLayer.parentElement.removeChild(this._dragLayer);
        }
    },

    _onSlideStart(type, event, move, end) {
        this._addDragLayer(type);
        event.stopPropagation();
        this.$root.toggleIntensive(true);
        const { button, clientX, clientY } = event;
        let startX = clientX;
        let startY = clientY;
        let deltaX = 0;
        let deltaY = 0;
        let accX = 0;
        let accY = 0;

        const onSlideMove = (event) => {
            event.stopPropagation();
            deltaX = event.clientX - startX;
            deltaY = event.clientY - startY;
            accX = event.clientX - clientX;
            accY = event.clientY - clientY;

            startX = event.clientX;
            startY = event.clientY;

            move && move(event, deltaX, deltaY, accX, accY);
        };

        const onSlideEnd = (event) => {
            event.stopPropagation();
            if (event.button === button) {
                document.removeEventListener('mousemove', onSlideMove);
                this.$root.toggleIntensive(false);
            }
            document.removeEventListener('mouseup', onSlideEnd);
            this._removeDragLayer();
            deltaX = event.clientX - startX;
            deltaY = event.clientY - startY;
            accX = event.clientX - clientX;
            accY = event.clientY - clientY;

            end && end(event, deltaX, deltaY, accX, accY);
        };

        document.addEventListener('mousemove', onSlideMove);
        document.addEventListener('mouseup', onSlideEnd);
    },

    _slideStartEvent() {
        this._initValue = this.dump.value;
    },

    _slideChangeEvent(event) {
        this.$refs.input.value = this.$refs.input.value + event.detail.dx * (this.$attrs.step || 1);
        this._changed = true;
        this.dump.value = this.$refs.input.value;
        this.dispatch('change');
    },

    _slideConfirmEvent() {
        if (this._changed) {
            this._changed = false;
            this.dump.value = this.$refs.input.value;
            this.dispatch('confirm');
        }
    },

    _slideCancelEvent() {
        if (this._changed) {
            this._changed = false;
            this.dump.value = this._initValue;
            this.dispatch('cancel');
        }
    },

    initEvents() {
        this.$el.addEventListener('mousedown', this._onMouseDown);
        // this.$el.addEventListener('keydown', this._onKeyDown);

        this.$el.addEventListener('slide-start', this._slideStartEvent);
        this.$el.addEventListener('slide-change', this._slideChangeEvent);
        this.$el.addEventListener('slide-confirm', this._slideConfirmEvent);
        this.$el.addEventListener('slide-cancel', this._slideCancelEvent);
    },
};

exports.render = function(h) {
    return h(
        'div',
        {
            staticClass: 'ui-prop',
            attrs: {
                slidable: this.slidable,
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
                            this.$attrs.slide
                                ? h('ui-slider', {
                                      staticClass: 'flex-1',
                                      ref: 'input',
                                      attrs: {
                                          ...this.$attrs,
                                          step: this.$attrs.step !== undefined ? this.$attrs.step : 1,
                                          value: this.dump.value,
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
                                  })
                                : h('ui-num-input', {
                                      staticClass: 'flex-1',
                                      ref: 'input',
                                      attrs: {
                                          ...this.$attrs,
                                          step: this.$attrs.step !== undefined ? this.$attrs.step : 1,
                                          value: this.dump.value,
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
