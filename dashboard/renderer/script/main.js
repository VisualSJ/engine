const ipc = require('@base/electron-base-ipc');
const Vue = require('vue/dist/vue.js');
const proManager = require('./../../../lib/project');
const dialog = require('./../../../lib/dialog');
const { dirname } = require('path');

// 定义相关常量数组
const SORT = ['name', 'ctime', 'otime'];
const TYPES = ['2d', '3d'];
const ORDER = ['desc', 'asc'];

let vm = new Vue({
    el: '#dashboard',
    data: {
        activeTab: 0, // 当前 2d 或 3d 项目 tab 项的 index
        recentShowIndex: -1, // 当前 hover 的'最近'项目的 index
        tempShowIndex: -1, // 当前 hover 的模板项目的 index
        activeTitle: 0, // 当前选择最近或模板的 index
        nav: ['2D项目', '3D项目'], // 侧边菜单项的文本内容
        titleTab: ['最近', '模板', '帮助'], // 顶部菜单项
        searchValue: '',
        templateSrc: '', //模板路径
        recentPro: [ // 2d 与 3d
            [],
            []
        ],
        templatePro: [ //  2d 与 3d 项目模板
            [],
            []
        ],
        filterCondetions: ['name', 'create time', 'open time'], // 筛选条件
        filterIndex: 0, // 选中的筛选选项
        showFilterOption: false, // 是否显示选中的项
        filter: -1, // 当前筛选种类 0 为排序，1 为搜索
        slortFlag: 0, // 当前排序升降顺序，升为 1 ,降为 0
    },
    computed: {
        showFilter() { // 是否显示搜索按钮
            return this.activeTitle !== 2;
        },
        recentData() { // 过滤搜索后的最近项目数据
            if (this.searchValue === '') {
                return this.recentPro[this.activeTab];
            }
            const result = this.recentPro[this.activeTab].filter((item) => {
                return item.name.indexOf(this.searchValue) !== -1;
            });
            return result;
        },
        templateData() { // 过滤搜索后的模板项目数据
            if (this.searchValue === '') {
                return this.templatePro[this.activeTab];
            }
            const result = this.templatePro[this.activeTab].filter((item) => {
                return item.name.indexOf(this.searchValue) !== -1;
            });
            return result;
        },
    },
    created() {
        this.init();
    },
    methods: {
        // 初始数据
        init() {
            let templateData = [];
            let recentData = [];
            TYPES.forEach((item, index) => {
                ipc.send('dashboard:getTemplate', item).callback((error, template) => {
                    templateData[index] = template;
                });
                recentData[index] = proManager.getList({type: item, ...this.getSearch()});
            });
            this.templatePro = templateData;
            this.recentPro = recentData;
        },
        // 打开最近项目
        openProject(path) {
            let that = this;
            if (!path) {
                dialog.openDirectory({
                    title: '打开项目',
                    onOk(filePath) {
                        if (!filePath) {
                            return;
                        }
                        proManager.add(TYPES[that.activeTab], filePath[0]);
                        proManager.open(filePath[0]);
                        that.init();
                    }
                });
                return;
            }
            proManager.open(path);
        },

        /**
         * 基于模板新建项目
         * @param {*} path
         */
        creatNewProject(path) {
            if (!path) {
                return;
            }
            dialog.openDirectory({
                title: '新建项目',
                onOk(filePath) {
                    if (!filePath) {
                        return;
                    }
                    proManager.create(filePath[0], path);
                    pkgJson.name = name;
                }
            });
        },

        /**
         * 从最近项目中移除
         * @param {number} index
         * @param {String} path 项目路径
         */
        removePro(index, path) {
            this.recentShowIndex = -1;
            this.recentPro[this.activeTab].splice(index, 1);
            proManager.remove(path);
        },

        // 时间戳转日期
        t(timestemp) {
            let time = new Date(timestemp);
            return `${time.toLocaleDateString()} ${time.toLocaleTimeString()}`;
        },

        // 更新 project数据
        updatePro() {
            let recentData = [];
            TYPES.forEach((item, index) => {
                recentData[index] = proManager.getList({type: item, ...this.getSearch()});
            });
            this.recentPro = recentData;
        },

        // 选择筛选项
        choose(index) {
            this.showFilterOption = false;
            this.filterIndex = index;
            this.updatePro();
        },

        // 计算筛选条件
        getSearch() {
            let obj = {};
            obj.order = ORDER[this.slortFlag];
            obj.sort = SORT[this.filterIndex];
            return obj;
        },
    },
});

const $windowContron = document.getElementById('windowContron');
const $windoeRow = document.getElementById('window-row');

// 存储是否已经最大化的flag变量
let maxiFlag = false;
// vue无法绑定可拖拽区域，故针对mac的样式需要操作dom添加
if (process.platform === 'darwin') {
    $windoeRow.className = 'window-row mac';
}
// 控制窗口关闭、最小化等(由于 vue 绑定的时机问题，使用 vue 绑定click无法接收到在可拖拽区域的点击事件)
$windowContron.addEventListener('click', (event) => {
    let name = event.target.getAttribute('name');
    if (!name) {
        return;
    }
    if (name === 'maxi') {
        if (maxiFlag) {
            name = 'unmaxi';
            maxiFlag = false;
        } else {
            maxiFlag = true;
        }
    }
    ipc.send(`dashboard:${name}`);
});
