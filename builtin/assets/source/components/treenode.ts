'use strict';
import { readFileSync } from 'fs';
import { extname, join } from 'path';

const { shell } = require('electron');
const openAsset = require('./open');

export const name = 'treenode';

export const template = readFileSync(
    join(__dirname, '../../static/template/treenode.html'),
    'utf8'
);

export const props: string[] = [
    'asset',
    'selects',
];

export function data() {
    return {
        draggable: true,
    };
}

export const watch = {
    'asset.state'() {
        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            const asset = this.asset;
            // @ts-ignore
            this.draggable = (asset.state !== '' || asset.invalid || asset.readonly) ? false : true;
            // @ts-ignore
            if (asset.state === 'input') {
                // @ts-ignore 选中该节点
                this.$emit('ipcSingleSelect', asset.uuid);
                // @ts-ignore
                this.$refs.input.focus();
                // @ts-ignore
                this.$refs.input.setSelectionRange(0, asset.name.lastIndexOf('.'));
            }
        });
    }
};

export const methods = {
    /**
     * 打开一个 asset
     * @param event
     * @param uuid
     */
    async open(event: Event, asset: ItreeAsset) {
        if (asset.invalid) {
            return;
        }

        const { fileext } = asset;

        if (openAsset[fileext]) {
            openAsset[fileext](asset);
        }
    },
    /**
     * 右击菜单
     * @param event
     * @param asset
     */
    mouseDown(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        if (event.button !== 2) {
            return;
        }
        event.stopPropagation();

        if (asset.invalid || asset.isSubAsset) { // 不需要右击菜单的情况
            return;
        }

        const self = this;

        Editor.Menu.popup({
            // @ts-ignore
            x: event.pageX,
            // @ts-ignore
            y: event.pageY,
            menu: [
                {
                    label: Editor.I18n.t('assets.menu.new'),
                    submenu: [
                        {
                            label: Editor.I18n.t('assets.menu.newFolder'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'folder' }, asset.uuid);
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newJavaScript'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'js' }, asset.uuid);
                            }
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newTypeScript'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'ts' }, asset.uuid);
                            }
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newCoffeeScript'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'coffee' }, asset.uuid);
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newScene'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'fire' }, asset.uuid);
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newAnimationClip'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'anim' }, asset.uuid);
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newAutoAtlas'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'pac' }, asset.uuid);
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newLabelAtlas'),
                            click() {
                                // @ts-ignore
                                self.$emit('ipcAdd', { ext: 'labelatlas' }, asset.uuid);
                            }
                        },
                    ]
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('assets.menu.copy'),
                    enabled: asset.readonly ? false : true,
                    click() {
                        // @ts-ignore
                        self.$emit('copy', asset.uuid);
                    }
                },
                {
                    label: Editor.I18n.t('assets.menu.paste'),
                    enabled: asset.readonly ? false : true,
                    click() {
                        // @ts-ignore
                        self.$emit('paste', asset.uuid);
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('assets.menu.rename'),
                    enabled: asset.readonly ? false : true,
                    click(event: Event) {
                        // @ts-ignore
                        self.rename(asset);
                    }
                },
                {
                    label: Editor.I18n.t('assets.menu.delete'),
                    enabled: asset.readonly ? false : true,
                    click() {
                        // @ts-ignore
                        self.$emit('ipcDelete', asset.uuid);
                    }
                },
                { type: 'separator', },
                {
                    label: Editor.I18n.t('assets.menu.openInlibrary'),
                    click() {
                        const path = join(Editor.Project.path, 'library', asset.uuid.substr(0, 2));
                        shell.openItem(path);
                    },
                },
                {
                    label: Editor.I18n.t('assets.menu.openInExplorer'),
                    click() {
                        const path = join(Editor.Project.path, asset.source.substr(5));
                        shell.showItemInFolder(path);
                    },
                },
                {
                    label: Editor.I18n.t('assets.menu.consoleLog'),
                    click() {
                        console.info(`UUID: ${asset.uuid}, PATH: ${asset.source}`);
                    },
                },
            ]
        });
    },
    /**
     * 选中某个节点
     * @param event
     * @param asset
     */
    click(event: Event, asset: ItreeAsset) {
        if (asset.invalid) {
            return;
        }

        // @ts-ignore
        if (event.ctrlKey || event.metaKey || event.shiftKey) { // 多选
            // @ts-ignore
            this.$emit('ipcMultipleSelect', event.shiftKey ? true : false, asset.uuid);
        } else { // 单选
            // @ts-ignore
            this.$emit('ipcSingleSelect', asset.uuid);
        }

        // 允许点击的元素有动画，不能直接全部放开动画是因为滚动中vue节点都会变动，导致动画都在执行
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('animate', '');
        setTimeout(() => {
            target.removeAttribute('animate');
        }, 500);
    },
    /**
     * 节点折叠切换
     * @param uuid
     */
    toggle(asset: ItreeAsset) {
        // @ts-ignore
        this.$parent.toggle(asset.uuid);
    },
    /**
     * 节点重名命
     * @param event
     * @param asset
     */
    rename(asset: ItreeAsset) {
        // 改变节点状态
        asset.state = 'input';
    },
    /**
     * 提交重名命
     * @param asset
     */
    renameBlur(asset: ItreeAsset) {
        // @ts-ignore
        let newName = this.$refs.input.value.trim();

        // 文件名称带有后缀，此时不能只发后缀
        if (newName.toLowerCase() === asset.ext) {
            newName = '';
        }

        // @ts-ignore
        this.$emit('rename', asset, newName);
    },
    /**
     * 开始拖动
     * 只能传字符，所以用了.stringify
     * @param event
     * @param uuid
     */
    dragStart(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        let from = asset.uuid;
        // @ts-ignore
        if (this.selects.includes(from)) {
            // @ts-ignore
            from = this.selects.join(',');
        }
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({from}));

        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAICRAEAOw==';
        // @ts-ignore
        event.dataTransfer.setDragImage(img, 0, 0);
    },
    /**
     * 拖动到元素的上面
     * 一个元素仍然识别为上中下三个区域
     * @param event
     * @param uuid
     */
    dragOver(event: Event, asset: ItreeAsset) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的
        // @ts-ignore
        const target: any = event.currentTarget;

        target.setAttribute('drag', 'over');

        target.setAttribute('insert', 'inside');

        // 拖动中感知当前所处的文件夹，高亮此文件夹
        // @ts-ignore
        this.$emit('dragOver', asset.uuid);
    },
    /**
     * 拖动移开
     * @param event
     * @param uuid
     */
    dragLeave(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('insert', '');
        target.setAttribute('drag', '');

        // 拖动中感知当前所处的文件夹，离开后取消高亮
        // @ts-ignore
        this.$emit('dragLeave', asset.uuid);
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * 由于 dataTransfer 不能在 drop 事件中 setData，事件不能冒泡到 tree drop 环节再执行，这里就需要 $emit
     * @param event
     * @param uuid
     */
    drop(event: Event, asset: ItreeAsset) {
        // 需要取消默认行为才能获取 dataTransfer 数据
        event.preventDefault();
        event.stopPropagation();

        // @ts-ignore
        const target: any = event.currentTarget;
        const insert = target.getAttribute('insert');
        target.setAttribute('insert', ''); // 还原节点状态
        target.setAttribute('drag', '');

        // 如果当前 ui-drag-area 面板没有 hoving 属性，说明不接受此类型的 drop
        // @ts-ignore
        if (!this.$parent.$el.hasAttribute('hoving')) {
            return;
        }

        if (asset.invalid) { // 不可用节点，比如 uuid 不存在
            return;
        }

        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');
        let data: IdragAsset;
        if (dragData === '') {
            // @ts-ignore
            data = {};
        } else {
            data = JSON.parse(dragData);
        }
        // @ts-ignore
        const localFiles = Array.from(event.dataTransfer.files);
        if (localFiles && localFiles.length > 0) { // 从外部拖文件进来
            data.from = 'osFile';
            data.insert = 'inside';
            // @ts-ignore
            data.files = localFiles;
        }

        data.to = asset.isSubAsset ? asset.parentUuid : asset.uuid; // 被瞄准的节点
        data.insert = insert; // 在重新排序前获取数据

            // @ts-ignore
        this.$emit('drop', data);

        // @ts-ignore
        this.$emit('dragLeave', asset.uuid); // 取消拖动的高亮效果

    }
};

export function mounted() {
    // @ts-ignore
    const asset = this.asset;
    if (asset.state !== '' || asset.invalid || asset.readonly) {
        // @ts-ignore
        this.draggable = false;
    }
}
