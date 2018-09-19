const ps = require('path');
const ipc = require('@base/electron-base-ipc');
const Vue = require('vue/dist/vue.js');

let vm = new Vue({
    el: '#dashboard',
    data: {
        activeTab: 1, // 当前 2d 或 3d 项目 tab 项的 index
        recentShowIndex: -1, // 当前 hover 的'最近'项目的 index
        tempShowIndex: -1, // 当前 hover 的模板项目的 index
        activeTitle: 0, // 当前选择最近或模板的 index
        nav: ['2D项目', '3D项目'], // 侧边菜单项的文本内容
        titleTab: ['最近', '模板', '帮助'], // 顶部菜单项
        searchValue: '',
        recentPro: [ // 2d 与 3d 最近项目数据
            [{
                    name: '2d项目1',
                    src: '../../../tester/2d项目1',
                    lastTime: '2018.09.17',
                    cover: './../img/picture-holer.jpg'
                },
                {
                    name: '2d项目2',
                    src: '../../../tester/2d项目2',
                    lastTime: '2018.09.17',
                    cover: './../img/picture-holer.jpg'
                },
                {
                    name: '2d项目3',
                    src: '../../../tester/2d项目3',
                    lastTime: '2018.09.17',
                    cover: './../img/picture-holer.jpg'
                },
                {
                    name: '2d项目1',
                    src: '../../../tester/index.js',
                    lastTime: '2018.09.17'
                },
                {
                    name: '2d项目2',
                    src: '../../../tester/index.js',
                    lastTime: '2018.09.17'
                },
                {
                    name: '2d项目3',
                    src: '../../../tester/index.js',
                    lastTime: '2018.09.17'
                },
            ],
            [{
                    name: '3d项目1',
                    src: '../../../tester/3d项目1',
                    lastTime: '2018.09.17',
                    cover: './../img/picture-holer.jpg'
                },
                {
                    name: '3d项目2',
                    src: '../../../tester/3d项目2',
                    lastTime: '2018.09.17',
                    cover: './../img/picture-holer.jpg'
                },
                {
                    name: '3d项目3',
                    src: '../../../tester/3d项目3',
                    lastTime: '2018.09.17',
                    cover: './../img/picture-holer.jpg'
                },
                {
                    name: '3d项目1',
                    src: '../../../tester/index.js',
                    lastTime: '2018.09.17'
                },
                {
                    name: '3d项目2',
                    src: '../../../tester/index.js',
                    lastTime: '2018.09.17'
                },
                {
                    name: '3d项目3',
                    src: '../../../tester/index.js',
                    lastTime: '2018.09.17'
                },
            ]
        ],
        templatePro: [ //  2d 与 3d 项目模板
            [{
                    name: 'Hello World',
                    describe: '新建一个 Cocos Creator 项目的默认模板，包括了一个项目中最基础的三个组成部分：场景、图片资源和脚本。'
                },
                {
                    name: '范例集合',
                    describe: '用一个个独立的范例展示组件和资源的使用方法，以及脚本编程和添加游戏性的实战策略。每个范例场景都附有说明文档，包括相关功能的使用方法和工作流程。推荐新手用来上手学习。'
                },
                {
                    name: 'Hello TypeScript',
                    describe: '新建一个使用 TypeScript 作为脚本语言的项目，包括类的继承、装饰器等语言功能的展示。'
                }
            ],
            [{
                    name: 'Hello World3d',
                    describe: '新建一个 Cocos Creator 项目的默认模板，包括了一个项目中最基础的三个组成部分：场景、图片资源和脚本。'
                },
                {
                    name: '范例集合3d',
                    describe: '用一个个独立的范例展示组件和资源的使用方法，以及脚本编程和添加游戏性的实战策略。每个范例场景都附有说明文档，包括相关功能的使用方法和工作流程。推荐新手用来上手学习。'
                },
                {
                    name: 'Hello TypeScript3d',
                    describe: '新建一个使用 TypeScript 作为脚本语言的项目，包括类的继承、装饰器等语言功能的展示。'
                }
            ]
        ]
    },
    computed: {
        showSearch() { // 是否显示搜索按钮
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
        }
    },
    created() {
        // todo 初始化'最近'与'模板'项目数据
    },
    methods: {
        openProject(src) {

            console.log('打开项目', src);
            // todo 打开对应项目

            this.enterProject(); // 进入编辑器，之后需要移除
        },
        creatNewProject(name) {
            if (!name) {
                // todo 新建空白项目
                this.enterProject(); // 进入编辑器，之后需要移除
                return;
            }
            // todo 基于模板新建项目
            console.log('新建模板项目', name);
        },
        controlWindow(cmd) { // 控制窗口关闭、最小化等
            ipc.send(`dashboard:${cmd}`);
        },
        enterProject() { // 进入编辑器，临时使用函数
            const project = ps.resolve(this.activeTab === 0 ? '.project-2d' : '.project');
            ipc.send('open-project', project);
        }
    },
});

const $windowContron = document.getElementById('windowContron');
let maxiFlag = false;

// 控制窗口关闭、最小化等(由于 vue 绑定的时机问题，使用 vue 无法接收到在可拖拽区域的点击事件)
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
