'use stirct';

const { arrayToTree, treeToShowArray } = require('./asset');
const create = require('./create');
const Vue = require('vue/dist/vue.min.js');

let panel;
let vm;
let cache;

exports.create = function(options) {
    panel = options.panel;
    cache = options.cache;

    vm = new Vue({
        el: panel.$.assets,

        data: {
            language: 'default',

            loading: true,

            total: 0, // 总显示资源条数
            length: 0, // 面板允许显示的条数
            index: 0, // 面板显示的起始索引
            list: [], // 面板内显示的实际列表

            box: '', // 包围盒的资源 uuid
            bindex: -1, // 包围盒的起始索引
            blength: 0, // 包围盒的可视长度

            copy: [], // 当前复制的资源 uuid 列表
            rename: '', // 当前整在 rename 的资源 source（只有带有 source 的资源可以改名）
            fold: { // 折叠状态 map，如果被折叠了，就会存在这里面
                ____idx: 0,
            },
            selects: { // 选中状态 map，如果被选中，就会存在这里面
                ____idx: 0,
            },

            filter: '', // 过滤字段
            info: '', // 页脚显示的数据
        },

        watch: {
            /**
             * 拖放节点出现的选择框更改
             */
            box() {
                vm.bindex = -1;
                let tmp = null;
                for (let i = 0; i < cache.shows.length; i++) {
                    const asset = cache.shows[i];
                    if (asset.uuid === vm.box) {
                        tmp = asset;
                        vm.bindex = i;
                        break;
                    }
                }

                let length = 0;
                if (vm.bindex === -1) {
                    vm.blength = length;
                    return;
                }

                for (let i = vm.bindex + 1; i < cache.shows.length; i++) {
                    const asset = cache.shows[i];
                    if (asset.indent <= tmp.indent) {
                        break;
                    }
                    length++;
                }

                vm.blength = length + 1;
            },
        },

        components: {
            'asset-tree': require('../component/asset-tree'),
        },

        methods: {

            /**
             * 翻译
             * @param {*} language
             * @param {*} key
             */
            t(key, language) {
                return Editor.I18n.t(`assets.${key}`);
            },

            /**
             * 传入当前允许显示的数组，生成实际显示到页面上的数组
             */
            async init() {
                const list = vm.list = [];
                vm.total = cache.shows.length;
                for (let i = 0; i < vm.length; i++) {
                    const item = cache.shows[i + vm.index];
                    if (!item) {
                        break;
                    }
                    list.push({
                        name: item.name,
                        source: item.source,
                        type: item.type,
                        uuid: item.uuid,
                        indent: item.indent,
                        folder: item.folder,
                        parent: item.parent,
                    });
                }
            },

            /**
             * 更改所有节点的展开状态
             * @param event
             * @param bool
             */
            _onFoldClick(event, bool) {
                function step(item) {
                    const asset = cache.map[item.uuid];
                    if (asset && (asset.isDirectory || Object.keys(asset.subAssets || {}).length)) {
                        if (!bool) {
                            vm.fold[item.uuid] = true;
                        } else {
                            delete vm.fold[item.uuid];
                        }
                    }

                    const names = Object.keys(item.subAssets || {});
                    for (const name of names) {
                        step(item.subAssets[name]);
                    }
                }

                const dbs = Object.keys(cache.tree);
                for (const db of dbs) {
                    step(cache.tree[db]);
                }

                bool && (vm.fold = {____idx: 0});

                // 初始化显示数据
                cache.shows = treeToShowArray(cache.tree, vm.fold, cache.map, vm.filter);
                vm.init();
            },

            /**
             * 过滤条件修改
             */
            _onFilterChanged(event) {
                vm.filter = event.target.value;

                // 如果 filter 不存在，则之前有过滤，并且刚刚删除过滤条件
                let uuid;
                Object.keys(vm.selects).some((id) => {
                    if (id === '____idx') {
                        return false;
                    }
                    uuid = id;
                    return true;
                });

                if (!vm.filter && uuid && cache.map[uuid]) {
                    // 检查当前选中的节点，如果被折叠，则需要调整显示出来（实体节点）
                    const paths = (cache.map[uuid].source || '').substr(5).split('/');
                    while (paths.pop()) {
                        const url = `db://${paths.join('/')}`;
                        const uuid = cache.url2uuid[url];
                        delete vm.fold[uuid];
                    }
                }

                cache.shows = treeToShowArray(cache.tree, vm.fold, cache.map, vm.filter);
                if (!vm.filter && uuid) {
                    for (let i = 0; i < cache.shows.length; i++) {
                        const item = cache.shows[i];
                        if (item.uuid !== uuid) {
                            continue;
                        }

                        const height = vm.$refs.tree.$el.clientHeight;
                        if (i < vm.index) {
                            requestAnimationFrame(() => {
                                vm.$refs.tree.$el.scrollTop = i * 20;
                            });
                        } else if (i * 20 > vm.index * 20 + height) {
                            requestAnimationFrame(() => {
                                vm.$refs.tree.$el.scrollTop = i * 20 - (height - 20);
                            });
                        }
                    }
                }

                vm.init();
            },

            /**
             * 获取折叠状态
             */
            _getFold() {
                return vm && Object.keys(vm.fold).length > 1;
            },

            /**
             * 点击新建文件
             */
            async _onCreateClick(event) {
                const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', 'asset');
                const url = await create.popup(event.pageX + 5, event.pageY + 5, uuid);
                vm.rename = url;
            },
        },

        mounted() {
            this.length = Math.ceil(this.$refs.content.clientHeight / 20) + 1;
        }
    });

    return vm;
};

exports.mount = function() {
    // 更改折叠状态
    vm.$on('change-fold', (uuid, bool) => {
        if (bool) {
            vm.fold[uuid] = true;
        } else {
            delete vm.fold[uuid];
        }
        vm.fold.____idx++;
        // 初始化显示数据
        cache.shows = treeToShowArray(cache.tree, vm.fold, cache.map, vm.filter);
        vm.init();
    });

    // 更改选中状态
    vm.$on('select-asset', (uuid, multi) => {
        vm.selects.____idx++;

        // 不允许多选的时候，需要清除之前选中的节点
        if (!multi) {
            for (const key in vm.selects) {
                if (key !== '____idx') {
                    delete vm.selects[key];
                    Editor.Ipc.requestToPackage('selection', 'unselect', 'asset', [key]);
                }
            }
        }

        if (uuid) {
            vm.selects[uuid] = true;
            Editor.Ipc.requestToPackage('selection', 'select', 'asset', [uuid]);
            const asset = cache.map[uuid];
            vm.info = asset ? asset.source : uuid;
        } else {
            vm.info = '';
        }
    });

    // 更改滚动状态
    vm.$on('change-index', (num) => {
        vm.index = num;
        vm.init();
    });

    // 复制当前选中的所有资源
    vm.$on('copy-select-asset', (uuids) => {
        vm.copy = Object.keys(vm.selects).filter((uuid) => {
            return !uuid.startsWith('____') && !uuid.startsWith('db://');
        });

        uuids.forEach((uuid) => {
            if (vm.copy.indexOf(uuid) !== -1) {
                return;
            }
            vm.copy.push(uuid);
        });
    });

    // 复制当前选中的所有资源
    vm.$on('paster-select-asset', async (target) => {
        target = cache.map[target];
        for (const uuid of vm.copy) {
            const asset = cache.map[uuid];
            if (!asset || !target) {
                continue;
            }
            await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', asset.source, target.source);
        }
    });

    let stash;
    // 开始拖拽某个资源
    vm.$on('drag-start', (uuid) => {
        stash = vm.selects;
        if (!vm.selects[uuid]) {
            vm.selects = {
                ____idx: 0,
                [uuid]: true,
            };
        }
    });

    // 拖拽某个资源结束
    vm.$on('drag-end', () => {
        requestAnimationFrame(() => {
            vm.selects = stash;
            stash = null;
            vm.box = '';
        });
    });

    // 拖拽进入某个 asset
    vm.$on('drag-enter', (uuid) => {
        if (!uuid) {
            vm.box = '';
            return;
        }

        cache.shows.some((asset) => {
            if (asset.uuid === uuid) {
                if (asset.type === 'directory' || asset.type === 'database') {
                    vm.box = asset.uuid;
                    return;
                }
                vm.box = asset.parent;
                return true;
            }
        });
    });

    // 放置 asset
    vm.$on('drop', async (uuids, files) => {
        if (!vm.box) {
            return;
        }

        let to;
        if (vm.box.startsWith('db://')) {
            to = vm.box;
        } else {
            to = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-url', vm.box);
        }

        // 移动资源
        for (const uuid of uuids) {
            const url = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-url', uuid);
            if (!url) {
                continue;
            }
            await Editor.Ipc.requestToPackage('asset-db', 'move-asset', url, to);
        }

        // 导入资源
        for (const file of files) {
            await Editor.Ipc.requestToPackage('asset-db', 'move-asset', file, to);
        }

        // 这里已经是异步更改的了
        vm.box = '';
    });

    // 改名
    vm.$on('rename-asset', (source) => {
        vm.rename = source;
    });
};
