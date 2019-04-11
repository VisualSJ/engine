'use strict';

const ipc = require('@base/electron-base-ipc');
const Vue = require('vue/dist/vue.js');
const {t} = require('./util');

Vue.config.productionTip = false;
Vue.config.devtools = false;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const $vm = new Vue({

    el: '#dashboard',

    data: {

        // 当前 2d 或 3d 项目 tab 项的 index
        type: '3d',

        // 侧边菜单项的文本内容
        types: [
            { type: '3d', value: 'project_3d' },
            { type: '2d', value: 'project_2d' },
        ],

        // 当前选中的菜单
        tab: 0,

        // 顶部菜单项
        tabs: ['open_project', 'new_project', 'help.title'],

    },

    components: {
        'silder-type': require('./components/type'),
        'content-header': require('./components/header'),
        'content-project': require('./components/project'),
        'content-template': require('./components/template'),
        'content-help': require('./components/help'),
    },

    mounted() {
        this.$on('change-type', (type) => {
            this.type = type;
            ipc.send(`dashboard:type`, this.type);
        });
        this.$on('change-tab', (tab) => {
            this.tab = tab;
        });
    },

    methods: {
        t,
    },
});

// 打开页面时可以指定的相关配置
ipc.on('dashboard:set-options', (event, options) => {
    options.tab && ($vm.tab = options.tab);
    options.type && ($vm.type = options.type);
});

const $windowContron = document.getElementById('windowContron');
const $windoeRow = document.getElementById('window-row');

// 存储是否已经最大化的flag变量
let maxiFlag = false;

// vue无法绑定可拖拽区域，故针对mac的样式需要操作dom添加
if (process.platform === 'darwin') {
    $windoeRow.className = 'window-row mac';
} else {
    // 控制窗口关闭、最小化等(由于 vue 绑定的时机问题，使用 vue 绑定 click 无法接收到在可拖拽区域的点击事件)
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
}
