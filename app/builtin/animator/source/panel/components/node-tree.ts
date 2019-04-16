
const {join} = require('path');
const {readFileSync} = require('fs-extra');
export const template = readFileSync(join(__dirname, './../../../static/template/components/node-tree.html'), 'utf-8');

export const props = [
    'dumps',
    'select',
    'indent', // 缩进
    'uuid', // 动画 clip uuid
];
export const name = 'node-tree';

export function data() {
    return {

    };
}

export const watch = {

};

export const computed = {
    nodeStyle(): any {
        return {
            // @ts-ignore
            'padding-left': `${this.indent * 8}px`,
        };
    },
};

export const components = {};

export const methods = {
    t(key: string) {
        return Editor.I18n.t(`animator.node_tree.${key}`);
    },
    onMouseDown(event: any) {
        const uuid = event.target.getAttribute('uuid');
        // @ts-ignore
        Editor.Selection.unselect('node', this.select);
        Editor.Selection.select('node', uuid);
    },
    // 操作函数
    onOperate(event: any) {
        const that: any = this;
        const name = event.target.getAttribute('name');
        switch (name) {
            case 'move':
                break;
            case 'clear':
                Editor.Ipc.sendToPanel('scene', 'clear-node-clip', that.uuid, that.dumps.path);
                break;
        }
    },
};

export function mounted() {
}
