'use strict';

exports.template = `
    <div class="vue-comp-ui flex-wrap">
        <div class="name pt10"><span :style="paddingStyle">{{dump.name}}</span></div>
        <div class="value flex-wrap ovh">
            <div class="flex-full flex ovh">
                <div class="flex-1 flex ovh pt10">
                    <ui-drag-object class="flex-1"
                        :path="dump.value.target.path"
                        :value="dump.value.target.value.uuid"
                        :type="dump.value.target.type"
                        @confirm.stop="_onConfirm($event, true)"
                    ></ui-drag-object>
                </div>
                <div class="flex-1 flex ovh pt10">
                    <ui-button class="tiny flex-1 ovh ui-left-gap event-prop-button"
                        :disabled="!menu"
                        @confirm.stop="selectComponentHandler">
                        {{componentHandler}}
                    </ui-button>
                </div>
            </div>
            <div class="vue-comp-ui flex-full">
                <div class="name"><span>CustomEventData</span></div>
                <div class="value">
                    <ui-input
                        :path="dump.value.customEventData.path"
                        :value="dump.value.customEventData.value"
                        @confirm.stop="_onConfirm"
                    >
                    </ui-input>
                </div>
            </div>
        </div>
    </div>
`;

exports.props = {
    dump: {
        required: true,
        type: Object
    },
    indent: {
        type: Number,
        default: 0
    }
};

exports.data = function() {
    return {
        menu: null,
        paddingStyle:
            this.indent !== 0
                ? {
                      'padding-left': `${this.indent * 13}px`
                  }
                : ''
    };
};

exports.mounted = function() {
    this.updateDump();
};

exports.watch = {
    'dump.value.target.value.uuid': 'updateDump'
};

exports.computed = {
    componentHandler() {
        if (this.menu) {
            const {value: component} = this.dump.value.component;
            const {value: handler} = this.dump.value.handler;

            if (component && handler) {
                return `${component} / ${handler}`;
            }
        }
        return 'Component / Handler';
    }
};

exports.methods = {
    getDumpByPath(path) {
        path = path.startsWith(this.dump.path) ? path.replace(`${this.dump.path}.`, '') : path;

        if ((path + '').includes('.')) {
            const paths = (path + '').split('.');
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
        const customEvent = new CustomEvent('property-changed', {
            bubbles: true,
            detail: {
                dump
            }
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
            // isUuid ? (dump.value.uuid = value) : (dump.value = value);
            this.dispatch({...dump, value});
        }

    },

    async updateDump(newVal, oldVal) {
        const {dump: {value:  {target: {value: {uuid}}}}} = this;
        // 根据 uuid 生成 menu
        if (uuid) {
            this.menu = await Editor.Ipc.requestToPackage('scene', 'query-component-function-of-node', uuid);
        } else {
            this.menu = null;
        }
        // 变更 uuid 或 uuid 为空清空 component 和 handler
        if (oldVal !== newVal || !uuid) {
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
                        }
                    }))
                };
            });

            Editor.Menu.popup({
                x,
                y,
                menu
            });
        }
    },

    updateComponentHandler(component, handler) {
        this.dump.value.component.value = component;
        this.dump.value.handler.value = handler;

        this.dispatch(this.dump.value.component);
        this.dispatch(this.dump.value.handler);
    }
};
