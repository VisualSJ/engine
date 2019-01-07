'use strict';
// todo test
exports.template = `
    <ui-prop
        :name="dump.name"
        :indent="indent"
        style="padding-top: 10px;"
        auto-height
    >
        <div class="layout vertical flex-1">
            <div class="layout horizontal">
                <ui-drag-object class="flex-1"
                    :path="dump.value.target.path"
                    :value="dump.value.target.value.uuid"
                    :dropable="dump.value.target.type"
                    :readonly="dump.readonly || readonly"
                    @confirm.stop="_onConfirm($event, true)"
                ></ui-drag-object>
                <ui-button class="tiny flex-1 ovh ui-left-gap event-prop-button"
                    :disabled="!menu"
                    @confirm.stop="selectComponentHandler">
                    {{componentHandler}}
                </ui-button>
            </div>
            <div class="layout horizontal" style="padding-top: 10px;">
                <div class="label" style="white-space:nowrap;padding-right:10px;padding-top:2px;">
                    CustomEventData
                </div>
                <ui-input
                    class="flex-1"
                    :path="dump.value.customEventData.path"
                    :value="dump.value.customEventData.value"
                    @confirm.stop="_onConfirm"
                >
                </ui-input>
            </div>
        </div>
    </ui-prop>
`;

exports.props = {
    dump: {
        required: true,
        type: Object,
    },
    indent: {
        type: Number,
        default: 0,
    },
    readonly: {
        type: Boolean,
        default: false,
    },
};

exports.data = function() {
    return {
        menu: null,
        foldUp: false,
        paddingStyle:
            this.indent !== 0
                ? {
                      'padding-left': `${this.indent * 13}px`,
                  }
                : '',
    };
};

exports.mounted = function() {
    this.updateDump();
};

exports.watch = {
    'dump.value.target.value.uuid': 'updateDump',
};

exports.computed = {
    componentHandler() {
        if (this.menu) {
            const { value: component } = this.dump.value.component;
            const { value: handler } = this.dump.value.handler;

            if (component && handler) {
                return `${component} / ${handler}`;
            }
        }
        return 'Component / Handler';
    },
};

exports.methods = {
    getDumpByPath(path) {
        if (!path) {
            return false;
        }
        path = String(path);
        path = path.startsWith(this.dump.path) ? path.replace(`${this.dump.path}.`, '') : path;

        if (path.includes('.')) {
            const paths = path.split('.');
            try {
                return paths.reduce((prev, next) => {
                    if (prev && prev[next]) {
                        return prev[next];
                    }
                    return false;
                }, this.dump);
            } catch (err) {
                console.error(err);
                return false;
            }
        }

        return path && this.dump.value[path] ? this.dump.value[path] : false;
    },
    /**
     * 向上传递修改事件
     */
    dispatch(dump) {
        const customEvent = new CustomEvent('change', {
            bubbles: true,
            detail: {
                ...dump,
            },
        });

        this.$el.dispatchEvent(customEvent);
    },

    /**
     * value 修改
     */
    _onConfirm(event, isUuid) {
        const { value } = event.target;
        const path = event.target.getAttribute('path');
        const dump = this.getDumpByPath(path);
        if (dump) {
            isUuid ? (dump.value.uuid = value) : (dump.value = value);
            this.dispatch(dump);
        }
    },

    async updateDump(newVal, oldVal) {
        const {
            dump: {
                value: {
                    target: {
                        value: { uuid },
                    },
                },
            },
        } = this;
        // 根据 uuid 生成 menu
        if (uuid) {
            this.menu = await Editor.Ipc.requestToPackage('scene', 'query-component-function-of-node', uuid);
        } else {
            this.menu = null;
        }
        // 变更 uuid 清空 component 和 handler
        if (oldVal !== newVal && this.dump.value.handler.value !== '') {
            this.updateComponentHandler('', '');
        }
    },

    selectComponentHandler(event) {
        if (this.menu) {
            const self = this;
            const { left, bottom } = event.target.getBoundingClientRect();
            const x = Math.round(left + 5);
            const y = Math.round(bottom + 5);
            const keys = Object.keys(this.menu);
            const menu = keys.map((component) => {
                const items = this.menu[component];

                return {
                    label: component.replace('cc.', ''),
                    submenu: items.map((handler) => ({
                        label: handler,
                        click() {
                            self.updateComponentHandler(component, handler);
                        },
                    })),
                };
            });

            Editor.Menu.popup({
                x,
                y,
                menu,
            });
        }
    },

    updateComponentHandler(component, handler) {
        this.dump.value.component.value = component;
        this.dump.value.handler.value = handler;

        this.dispatch(this.dump.value.component);
        this.dispatch(this.dump.value.handler);
    },
};
