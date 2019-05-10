
const {join} = require('path');
const {readFileSync} = require('fs-extra');
export const template = readFileSync(join(__dirname, './../../../static/template/components/node-tree.html'), 'utf-8');

export const props = [
    'dumps',
    'selectPath',
    'indent', // 缩进
    'uuid', // 动画 clip uuid
    'movePath',
    'lock',
];
export const name = 'node-tree';

export function data() {
    return {
        hoving: false,
    };
}

export const watch = {

};

export const computed = {
    disabled() {
        const that: any = this;
        if (that.lock || !that.dumps.uuid) {
            return true;
        }
    },
    nodeStyle(): any {
        return {
            // @ts-ignore
            'padding-left': `${this.dumps.indent * 4}px`,
        };
    },

    nodeClass():any {
        const that: any = this;
        if (!that.movePath) {
            return 'content-item';
        }
        if (that.movePath === that.dumps.path) {
            return 'content-item moving';
        }
        return 'content-item'
    },

    movingProperty() {
        const that: any = this;
        if (that.movePath && !that.dumps.uuid) {
            return 'missing';
        }
        if (that.movePath && that.dumps.uuid) {
            return true;
        }
        return false;
    }
};

export const components = {};

export const methods = {
    t(key: string, type = 'node_tree.') {
        return Editor.I18n.t(`animator.${type}${key}`);
    },
    async onMouseDown(event: any, path: string) {
        const that: any = this;
        if (that.movePath) {
            if (!that.dumps.uuid) {
                return;
            }
            const result = await that.checkMoveData();
            if (result) {
                that.$emit('datachange', 'moveData', [path]);
            }
            return;
        }
        const name = event.target.getAttribute('name');
        if (name === 'showPopMenu' || event.button === 2) {
            Editor.Menu.popup({
                x: event.pageX,
                y: event.pageY,
                menu: [{
                        label: that.t('clear_data'),
                        click() {
                            that.$emit('datachange', 'clearNode', [path]);
                        },
                        enabled: !that.disabled,
                    },
                    {
                        label: that.t('move_data'),
                        click() {
                            that.$emit('datachange', 'setMovePath', [path]);
                        },
                        enabled: !that.lock,
                    },
                ],
            });
            return;
        }
        if (that.selectPath === path) {
            return;
        }
        that.$emit('datachange', 'select', [path]);
    },

    onDragStart() {
        const that: any = this;
        that.$emit('datachange', 'setMovePath', [that.dumps.path]);
    },
    onDragEnd() {
        const that: any = this;
        that.$emit('datachange', 'setMovePath', ['']);
    },
    onDragOver(event: any) {
        const that: any = this;
        if (!that.movePath || !that.dumps.uuid) {
            return;
        }
        if (that.dumps.path === that.movePath) {
            return;
        }
        that.hoving = true;
        event.preventDefault();
    },
    onDragLeave() {
        // @ts-ignore
        this.hoving = false;
    },
    onDrop() {
        const that: any = this;
        that.$emit('datachange', 'moveData', [that.dumps.path]);
    },
    async checkMoveData() {
        const that: any = this;
        const t = function(key: string) {
            return that.t('',key);
        };
        const result = await Editor.Dialog.show({
            type: 'info',
            title: t('is_move_data'),
            message: t('is_move_data_message'),
            buttons: [t('cancel'), t('move')],
            default: 0,
            cancel: 0,
        });
        if (result === 1) {
            return true;
        }
    },
};

export function mounted() {}
