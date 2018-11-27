'use strict';

import { shell } from 'electron';
import { readFileSync } from 'fs';
import { ensureDirSync } from 'fs-extra';
import { basename, join, relative } from 'path';
const builder = require('./../static/scripts/builder.js');
const PlatformConfigs = require('./../static/scripts/platforms-config.js');

const Vue = require('vue/dist/vue.js');

// windows 环境下，编译的长度<=259，扣除引擎后面的固定路径算出这个值，路径长度小于等于这个值即可
const MAX_BUILD_PATH_FOR_WIN32 = 58;

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    build: '.build',
};
/**
 * 配置 build 的 iconfont 图标
 */
export const fonts = [{
    name: 'build',
    file: 'packages://build/static/iconfont.woff',
}];

export const methods = {};

export const messages = {};

export async function ready() {

    // @ts-ignore
    panel = this;

    new Vue({
        el: panel.$.build,
        data: {
            // 配置的默认值
            platform: 'web-mobile',
            build_path: './build',
            debug: true,
            source_map: false,
            // 需要动态获取的默认配置
            name: '', // 游戏名称
            start_scene: '',
            scenes: [],
            checkSuccss: true,
            state: 'info',
            message: '',
            progressRate: 0,
        },
        computed: {
            selectAll: {
                get(): any {
                    // @ts-ignore
                    const value = this.scenes.some((item: any) => {
                        // @ts-ignore
                        return (item.uuid !== this.start_scene && item.choose === false);
                    });
                    return !value;
                },
                set(newValue: boolean) {
                    // @ts-ignore
                    this.scenes = this.scenes.map((item: any) => {
                        let chooseValue = newValue;
                        // @ts-ignore
                        if (item.uuid === this.start_scene) {
                            chooseValue = item.choose;
                        }
                        return {
                            uuid: item.uuid,
                            url: item.url,
                            choose: chooseValue,
                        };
                    });
                },
            },
            btnState: {
                get() {
                    const obj = {
                        build: false,
                        compile: false,
                        run: false,
                    };
                    // @ts-ignore
                    if (this.checkSuccss) {
                        obj.build = true;
                    }
                    // @ts-ignore
                    if (this.platform === 'android' || this.platform === 'win32') {
                        obj.compile = true;
                    }
                    return obj;
                },
                set(newValue: any) {

                },
            },
        },
        methods: <any>{
            /**
             * 翻译
             * @param key
             */
            t(key: string) {
                const name = `build.${key}`;
                return Editor.I18n.t(name);
            },

            /**
             * 数据初始化
             */
            async initData() {
                this.name = basename(Editor.Project.path);
                const scenes = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', {type: 'scene'});
                this.scenes = scenes.map((item: any) => {
                    return {
                        uuid: item.uuid,
                        url: item.source,
                        choose: true,
                    };
                });
                this.start_scene = this.scenes[0].uuid;
            },

            // 更新 value
            onChangeValue(event: any) {
                const key = event.target.path;
                if (!key) {
                    return;
                }
                this.onCheckChange(key, event.target.value);
            },

            error(message: string) {
                Editor.Dialog.show({
                    type: 'error',
                    message,
                });
                this.checkSuccss = false;
            },

            onChangeScene(event: any, index: any) {
                const value = !!event.target.value;
                this.scenes[index] && (this.scenes[index].choose = value);
            },

            // 检查数据后再更新数据
            onCheckChange(key: string, value: any) {
                // TODO 更多构建平台加入后，需要更新完善该检测函数
                switch (key) {
                    case 'name':
                        break;
                    case 'build_path':
                        const buildPath = join(Editor.Project.path, value);
                        const isNative = PlatformConfigs[this.platform].isNative;

                        if (process.platform === 'win32' && isNative && buildPath.length > MAX_BUILD_PATH_FOR_WIN32) {
                            this.error(this.t('path_too_long_title'));
                            return;
                        }

                        if (buildPath.indexOf(' ') !== -1) {
                            this.error(`${this.t('error.build_error')}, ${this.t('error.build_path_contains_space')}`);
                            return;
                        }

                        const containsChinese = /.*[\u4e00-\u9fa5]+.*$/.test(buildPath);
                        if (containsChinese) {
                            this.error(`${this.t('error.build_error')},
                            ${this.t('error.build_path_contains_chinese')}`);
                            return;
                        }
                        ensureDirSync(buildPath);
                        this.checkSuccss = true;
                        break;
                    default:
                        this.checkSuccss = true;
                        break;
                }
                if (this.checkSuccss) {
                    value && (this[key] = value);
                }
                // Editor.Ipc.sendToPackage('build', 'set-builder', `${key}`, this[key]);
                // Editor.Ipc.sendToPackage('build', 'save-builder');
            },

            async onChooseBuildPath() {
                const path = await Editor.Dialog.openDirectory({
                    title: '选择发布文件夹',
                    defaultPath: Editor.Project.path,
                });
                this.build_path = relative(Editor.Project.path, path);
            },

            onOpenBuildPath() {
                shell.openExternal(join(Editor.Project.path, this.build_path));
            },

            // 点击构建按钮
            onBuild(event: any) {
                event.target.state = 'loading';
                this._build();
            },

            // 构建项目
            _build() {
                const data = {
                    platform: this.platform,
                    source_map: this.source_map,
                    name: this.name,
                    start_scene: this.start_scene,
                    scenes: [],
                };
                data.scenes = this.scenes.map((item: any) => {
                    if (item.choose) {
                        return({
                            uuid: item.uuid,
                            url: item.url,
                        });
                    }
                });

                const options = Object.assign(data, this.$refs.children._data);
                options.embedWebDebugger =
                (this.platform === 'web-mobile' || this.platform === 'fb-instant-games') && options.debug;
                builder.build(options);
                // 监听编译状态变化
                builder.on('changeState', (state: string, message: string) => {
                    this.state = state;
                    this.message = message;
                });

                // 监听构建进度
                builder.on('progress', (rate: number) => {
                    this.progressRate = rate + '%';
                });
            },
        },
        components: {
            'web-desktop' : require('./components/web-desktop'),
            'web-mobile' : require('./components/web-mobile'),
        },
        mounted() {
            this.initData();
        },
    });
}

export async function beforeClose() {}

export async function close() {}
