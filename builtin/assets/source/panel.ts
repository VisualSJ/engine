'use stirct';

require('../static/font');
const { readFileSync } = require('fs');
const { join } = require('path');
const { arrayToTree, treeToShowArray } = require('../static/utils/asset');

const vue = require('../static/utils/vue');

let panel: any;
let vm: any;

function _onLanguageSwitch(language: string) {
    vm && (vm.language = language);
}

const cache = {
    tree: {},
    map: {},
    url2uuid: {},
    shows: [],
};

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

/**
 * 配置 assets 的 iconfont 图标
 */
export const fonts = [{
    name: 'assets',
    file: 'packages://assets/static/font.woff',
}];

export const $ = {
    assets: '.assets',
};

export const methods = {

    /**
     * 暂存页面数据
     */
    async staging() {
        const uuids = Object.keys(vm.fold).filter((key) => {
            return key !== '____idx';
        });
        Editor.Ipc.sendToPackage('assets', 'staging-fold', uuids);
    },

    /**
     * 恢复页面数据
     */
    async unstaging() {
        // 初始化缓存的折叠数据
        const folds = await Editor.Ipc.requestToPackage('assets', 'query-staging-fold');
        folds.forEach((uuid: string) => {
            vm.fold[uuid] = true;
        });
    },

    /**
     * 刷新显示的数据
     */
    async refresh() {
        const assets = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        const info = arrayToTree(assets);
        cache.tree = info.tree;
        cache.map = info.map;
        cache.url2uuid = info.url2uuid;

        // 初始化显示数据
        cache.shows = treeToShowArray(info.tree, vm.fold, info.map, vm.filter);
        vm.init();
    },

    /**
     * 从最后选中的节点向上移动一位
     */
    async moveUp() {
        const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', 'asset');

        // @ts-ignore
        cache.shows.some((item: any, index: number) => {
            if (item.uuid === uuid) {
                const asset = cache.shows[index - 1];
                // @ts-ignore
                asset && vm.$emit('select-asset', asset.uuid, false);
                return true;
            }
        });
    },

    /**
     * 从最后选中的节点上向下移动一位
     */
    async moveDown() {
        const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', 'asset');

        // @ts-ignore
        cache.shows.some((item: any, index: number) => {
            if (item.uuid === uuid) {
                const asset = cache.shows[index + 1];
                // @ts-ignore
                asset && vm.$emit('select-asset', asset.uuid, false);
                return true;
            }
        });
    },

    /**
     * 折叠当前节点
     */
    async foldCurrent() {
        const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', 'asset');
        vm.$emit('change-fold', uuid, true);
    },

    /**
     * 展开当前节点
     */
    async unFoldCurrent() {
        const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', 'asset');
        vm.$emit('change-fold', uuid, false);
    },

    /**
     * 记录当前选中的节点信息
     */
    async copy() {
        vm.$emit('copy-select-asset', []);
    },

    /**
     * 将复制后的数据粘贴到某个位置
     */
    async paste() {
        const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', 'asset');
        // @ts-ignore
        const asset = cache.map[uuid];
        if (asset.isDirectory) {
            vm.$emit('paster-select-asset', uuid);
        }
    },

    /**
     * 拷贝当前节点到原始位置
     */
    async duplicate() {
        vm.$emit('copy-select-asset', []);
        const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', 'asset');
        // @ts-ignore
        let asset = cache.map[uuid];
        let parent = '';
        while (asset && !asset.isDirectory) {
            // @ts-ignore
            cache.shows.some((item: any, index: number) => {
                if (item.uuid === uuid) {
                    parent = item.parent;
                    // @ts-ignore
                    asset = cache.map[parent];
                    return true;
                }
            });
        }

        if (!asset) {
            return;
        }

        vm.$emit('paster-select-asset', asset.uuid);
    },

    /**
     * 查找节点
     */
    find() {
        vm.$refs.filter.focus();
    },

    /**
     * 全选节点
     */
    selectAll() {
        cache.shows.forEach((item: any) => {
            vm.$emit('select-asset', item.uuid, true);
        });
    },
};

export const messages = {
    /**
     * 选中了物体之后发出的广播
     */
    'selection:select'(type: string, uuid: string) {
        if (type !== 'asset') {
            return;
        }
        vm.selects[uuid] = true;
        vm.selects.____idx++;

        // @ts-ignore
        const asset = cache.map[uuid];
        vm.info = asset ? asset.source : uuid;
    },

    /**
     * 取消物体选中发出的消息
     */
    'selection:unselect'(type: string, uuid: string) {
        if (type !== 'asset') {
            return;
        }
        delete vm.selects[uuid];
        vm.selects.____idx++;
    },

    /**
     * db 准备就绪发送的消息
     */
    'asset-db:ready'() {
        vm.loading = false;
        clearTimeout(panel.timer);
        panel.timer = setTimeout(async () => {
            await panel.unstaging();
            requestAnimationFrame(() => {
                panel.refresh();
            });
        }, 300);
    },

    /**
     * db 关闭的时候发送的消息
     */
    'asset-db:close'() {
        panel.staging();
        vm.fold = {};
        vm.list = [];
        vm.total = 0;
        vm.index = 0;
        vm.loading = true;
    },

    /**
     * 资源添加之后的广播
     * @param uuid
     */
    async 'asset-db:asset-add'(uuid: string) {
        clearTimeout(panel.timer);
        panel.timer = setTimeout(() => {
            panel.refresh();
        }, 300);
    },

    /**
     * 资源移除之后的广播
     * @param uuid
     */
    'asset-db:asset-delete'(uuid: string) {
        clearTimeout(panel.timer);
        panel.timer = setTimeout(() => {
            panel.refresh();
        }, 300);

        delete vm.selects[uuid];
        delete vm.copy[uuid];
        delete vm.fold[uuid];
    },
};

export const listeners = {

    /**
     * 窗口大小变化的时候检查可显示的数据长度是多少
     */
    resize() {
        vm.length = Math.ceil(vm.$refs.content.clientHeight / 20) + 1;
        vm.init();
    },

    /**
     * 窗口从隐藏改为显示的时候需要更新显示数据长度
     */
    show() {
        vm.length = Math.ceil(vm.$refs.content.clientHeight / 20) + 1;
        vm.init();
    },
};

export async function ready() {

    // @ts-ignore
    panel = this;

    vm = vue.create({
        panel,
        cache,
    });
    vue.mount();

    // 初始化缓存的折叠数据
    await panel.unstaging();

    ////////////////////
    // 请求编辑器内其他数据

    const selects = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
    selects.forEach((uuid: string) => {
        vm.selects[uuid] = true;
        vm.selects.____idx++;
    });

    // 检查资源数据库是否准备就绪
    const isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
    if (isReady) {
        panel.refresh();
        vm.loading = false;
    }

    Editor.I18n.on('switch', _onLanguageSwitch);
}

export function beforeClose() {}

export function close() {
    panel.staging();
    Editor.I18n.removeListener('switch', _onLanguageSwitch);
}
