'use strict';

const { shell } = require('electron');
const { readFileSync } = require('fs');
const { join } = require('path');

const create = require('../utils/create');
const types = require('../utils/types');

const openUtils = require('../utils/open');

exports.template = readFileSync(join(__dirname, '../template/asset-item.html'), 'utf8');

exports.components = {
    'asset-icon': require('./asset-icon'),
};

exports.props = [
    'node',
    'fold',
    'selects',
    'copy',
    'rename',
    'filter',
];

exports.data = function() {
    this.node = this.node || {};
    return {
        // 是否选中
        active: !!this.selects[this.node.uuid],

        // 节点层级带来的缩进
        itemStyle: {
            'padding-left': this.node.indent * 20 + 'px',
        },
    };
};

exports.watch = {
    /**
     * 当前渲染的节点更改的时候需要更新选中状态
     */
    node() {
        this.itemStyle['padding-left'] = this.node.indent * 20 + 'px';
        this.active = !!this.selects[this.node.uuid];

        if (!this.rename || this.node.source !== this.rename) {
            return;
        }
        requestAnimationFrame(() => {
            this.$refs.rename.focus();
        });
    },

    /**
     * 正在改名的节点更改之后，需要更新自身
     */
    rename() {
        if (!this.rename || this.node.source !== this.rename) {
            return;
        }
        requestAnimationFrame(() => {
            this.$refs.rename.focus();
        });
    },

    /**
     * 当前节点的缩进更新的时候，需要更新显示的缩进
     */
    'node.indent'() {
        this.itemStyle['padding-left'] = this.node.indent * 20 + 'px';
    },

    /**
     * 选中节点更新的时候，需要更新自身的选中状态
     */
    'selects.____idx'() {
        this.active = !!this.selects[this.node.uuid];
    },
};

exports.methods = {
    /**
     * 翻译类型
     * @param {*} type
     */
    translateType(type) {
        return types.map[type] || 'asset';
    },

    /**
     * 弹出右键菜单
     */
    async popup(x, y) {
        const vm = this.$root;
        const el = this;

        const asset = this.node;
        const selects = this.selects;

        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.node.uuid);

        const options = {
            x, y,
            menu: [
                {
                    label: this.node.name,
                    enabled: false,
                },
                { type: 'separator', },
                {
                    label: Editor.I18n.t('assets.popup.create'),
                    submenu: create.generateTemplate(info, (url) => {
                        vm.$emit('rename-asset', url);
                    }),
                },
                { type: 'separator', },
                {
                    label: Editor.I18n.t('assets.popup.copy'),
                    click() {
                        vm.$emit('copy-select-asset', [asset.uuid]);
                    },
                },
                {
                    label: Editor.I18n.t('assets.popup.paste'),
                    enabled: !!this.copy.length && this.node.type === 'directory',
                    click() {
                        vm.$emit('paster-select-asset', [asset.uuid]);
                    },
                },
                { type: 'separator', },
                {
                    label: Editor.I18n.t('assets.popup.rename'),
                    click() {
                        vm.$emit('rename-asset', asset.source);
                    },
                },
                {
                    label: Editor.I18n.t('assets.popup.delete'),
                    async click() {
                        const deletes = [];
                        if (selects[asset.uuid]) {
                            const uuids = Object.keys(selects);
                            for (const uuid of uuids) {
                                if (uuid === '____idx') {
                                    continue;
                                }
                                deletes.push(await Editor.Ipc.requestToPackage('asset-db', 'query-asset-url', uuid));
                            }
                        } else {
                            deletes.push(await Editor.Ipc.requestToPackage('asset-db', 'query-asset-url', asset.uuid));
                        }

                        for (const url of deletes) {
                            Editor.Ipc.sendToPackage('asset-db', 'delete-asset', url);
                        }
                    },
                },
                // {
                //     label: 'reset', click() {

                //     },
                // },
                { type: 'separator', },
                {
                    label: Editor.I18n.t('assets.popup.jump_library'),
                    click() {
                        const path = join(Editor.Project.path, 'library', asset.uuid.substr(0, 2));
                        shell.openItem(path);
                    },
                },
                {
                    label: Editor.I18n.t('assets.popup.jump_source'),
                    click() {
                        const path = join(Editor.Project.path, asset.source.substr(5));
                        shell.showItemInFolder(path);
                    },
                },
                {
                    label: Editor.I18n.t('assets.popup.print_info'),
                    click() {
                        console.info(`UUID: ${asset.uuid}, PATH: ${asset.source}`);
                    },
                },
                // { type: 'separator', },
                // { label: 'submenu', submenu: [{ label: 'test2', click() { } }] },
            ],
        };
        Editor.Menu.popup(options);
    },

    /**
     * 鼠标在资源条上按下
     */
    _onItemMouseDown(event) {
        if (event.button !== 2) {
            return;
        }
        event.stopPropagation();
        this.popup(event.pageX, event.pageY);
    },

    /**
     * 点击更改节点选中状态
     */
    _onItemClick(event) {
        event.stopPropagation();
        this.$root.$emit('select-asset', this.node.uuid, event.metaKey || event.altKey);
    },

    /**
     * 双击资源节点
     */
    _onItemDBClick(event) {
        event.stopPropagation();
        openUtils.open(this.node);
    },

    /**
     * 拖拽移入当前 item
     */
    _onItemDragStart(event) {
        this.$root.$emit('drag-start', this.node.uuid);

        const uuids = Object.keys(this.$root.selects).filter((uuid) => {
            return uuid !== '____idx';
        });
        event.dataTransfer.setData('value', uuids);
    },

    /**
     * 拖拽移入当前 item
     */
    _onItemDragEnter(event) {
        // 等待离开上一个 item 的消息触发后，才能触发进入，否则顺序不对
        requestAnimationFrame(() => {
            this.$root.$emit('drag-enter', this.node.uuid);
        });
    },

    /**
     * 拖拽结束
     */
    _onItemDragEnd(event) {
        this.$root.$emit('drag-end');
    },

    /**
     * 拖拽移出当前的 item
     */
    _onItemDragLeave(event) {
        this.$root.$emit('drag-enter', null);
    },

    /**
     * 点击了更改折叠状态的按钮
     */
    _onFoldClick(event) {
        event.stopPropagation();
        this.$root.$emit('change-fold', this.node.uuid, !this.fold[this.node.uuid]);
    },

    /**
     * 离开重命名窗口
     */
    _onInputBlur(event) {
        const name = event.target.value;
        if (this.node.name !== name) {
            Editor.Ipc.sendToPackage('asset-db', 'rename-asset', this.node.uuid, name);
            this.node.name = name;
        }
        this.$root.$emit('rename-asset', '');
    },

    /**
     * 重命名生效
     */
    _onInputEnter() {
        const name = event.target.value;
        if (this.node.name !== name) {
            Editor.Ipc.sendToPackage('asset-db', 'rename-asset', this.node.uuid, name);
            this.node.name = name;
        }
        this.$root.$emit('rename-asset', '');
    },

    /**
     * 重命名取消
     */
    _onInputEsc() {
        this.$root.$emit('rename-asset', '');
    },
};

exports.mounted = function() {

};
