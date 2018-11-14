'use strict';

const ipc = require('@base/electron-base-ipc');
const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

Vue.config.productionTip = false;
Vue.config.devtools = false;

new Vue({

    el: '#dashboard',

    data: {

        // 当前 2d 或 3d 项目 tab 项的 index
        type: '3d',

        // 侧边菜单项的文本内容
        types: [
            { type: '2d', text: '2D项目', },
            { type: '3d', text: '3D项目', },
        ],

        // 当前选中的菜单
        tab: 0,

        // 顶部菜单项
        tabs: ['最近', '模板', '帮助'],

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
        });
        this.$on('change-tab', (tab) => {
            this.tab = tab;
        });
    },
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
