'use strict';

import { shell } from 'electron';
import { readFileSync } from 'fs';
import { ensureDirSync } from 'fs-extra';
import { basename, join, relative } from 'path';
const PlatformConfigs = require('./../static/scripts/platforms-config.js');

const Vue = require('vue/dist/vue.js');

// windows 环境下，编译的长度<=259，扣除引擎后面的固定路径算出这个值，路径长度小于等于这个值即可
const MAX_BUILD_PATH_FOR_WIN32 = 58;

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;
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

export const messages = {
    'asset-db:ready'() {
        !vm.isReady && vm.initData();
    },
    // 更新当前构建进度
    'build:update-progress'(msg: string, rate: any) {
        vm.message = msg;
        if (rate) {
            vm.rate += rate;
        }
    },
};

export async function ready() {

    // @ts-ignore
    panel = this;

    vm = new Vue({
        el: panel.$.build,
        data: {
            setting: {
                // 配置的默认值
                platform: 'web-mobile',
                build_path: './build',
                debug: false, // 调试模式
                source_map: false,
                inline_SpriteFrames: false, // 是否内联所有的 SpriteFrame
            },
            // 需要动态获取的默认配置
            name: '', // 游戏名称
            start_scene: '',
            scenes: [],
            checkSuccss: true,
            state: 'info',
            message: '',
            rate: 0,
            data: {},
            isReady: false,
        },
        computed: {
            selectAll(): any {
                // @ts-ignore
                const value = this.scenes.some((item: any) => {
                    // @ts-ignore
                    return (item.uuid !== this.start_scene && item.choose === false);
                });
                return !value;
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
                    if (this.setting.platform === 'android' || this.setting.platform === 'win32') {
                        obj.compile = true;
                    }
                    return obj;
                },
                set(newValue: any) {

                },
            },
            progressRate(): string {
                // @ts-ignore
                return this.rate + '%';
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
                const settingData = await Editor.Ipc.requestToPackage('build', 'get-builder-setting', 'common');
                if (settingData) {
                    for (const key of Object.keys(settingData)) {
                        if (key in this.setting) {
                            this.setting[key] = settingData[key];
                        }
                    }
                }
                this.name = basename(Editor.Project.path);
                const scenes = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', {type: 'scene'});
                if (scenes) {
                    this.isReady = true;
                }
                this.scenes = scenes.map((item: any) => {
                    return {
                        uuid: item.uuid,
                        url: item.source,
                        choose: true,
                    };
                });
                this.start_scene = this.scenes[0].uuid;
                await this.updateData();
            },

            // 更新 value
            onChangeValue(event: any) {
                const key = event.target.path;
                if (!key) {
                    return;
                }
                if (key === 'platform') {
                    this.updateData();
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
                const {platform} = this.setting;
                // TODO 更多构建平台加入后，需要更新完善该检测函数
                switch (key) {
                    case 'name':
                        break;
                    case 'build_path':
                        const buildPath = join(Editor.Project.path, value);
                        const isNative = PlatformConfigs[platform].isNative;

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
                    case 'selectAll':
                        // @ts-ignore
                        this.scenes = this.scenes.map((item: any) => {
                            let chooseValue = value;
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
                        this.checkSuccss = false;
                        break;
                    default:
                        this.checkSuccss = true;
                        break;
                }
                // 数据监测无误后，赋值存储
                if (this.checkSuccss) {
                    if (key in this.setting) {
                        value && (this.setting[key] = value);
                        this.dataChanged('common', key, value);
                        this.updateData();
                    } else {
                        value && (this[key] = value);
                    }
                }

            },

            // 选择构建后的文件夹
            async onChooseBuildPath() {
                const path = await Editor.Dialog.openDirectory({
                    title: '选择发布文件夹',
                    defaultPath: Editor.Project.path,
                });
                this.setting.build_path = relative(Editor.Project.path, path);
            },

            // 打开构建发布后的文件夹
            onOpenBuildPath() {
                shell.openExternal(join(Editor.Project.path, this.setting.build_path));
            },

            // 点击构建按钮
            onBuild(event: any) {
                event.target.state = 'loading';
                this._build();
            },

            // 构建项目
            async _build() {
                this.rate = 0;
                const {platform, source_map, debug, build_path} = this.setting;
                const data = {
                    platform,
                    source_map,
                    name: this.name,
                    start_scene: this.start_scene,
                    debug,
                    scenes: [],
                    dest: join(Editor.Project.path, build_path, platform),
                };
                const scenes: any = [];
                this.scenes.map((item: any) => {
                    if (item.choose) {
                        scenes.push({
                            // @ts-ignore
                            uuid: item.uuid,
                            // @ts-ignore
                            url: item.url,
                        });
                    }
                });
                data.scenes = scenes;
                const excludedModules: any[] = [];
                const options = Object.assign(data, this.$refs.children._data, {excludedModules});
                options.embedWebDebugger =
                (platform === 'web-mobile' || platform === 'fb-instant-games') && options.debug;
                Editor.Ipc.sendToPackage('build', 'build', options);
            },

            dataChanged(type: string, key: string, value: any) {
                Editor.Ipc.sendToPackage('build', 'set-builder-setting', `${type}.${key}`, value);
                Editor.Ipc.sendToPackage('build', 'save-builder-setting');
            },

            async updateData() {
                const data = await Editor.Ipc.requestToPackage('build', 'get-builder-setting', this.setting.platform);
                this.data = data;
            },
        },
        components: {
            'web-desktop' : require('./components/web-desktop'),
            'web-mobile' : require('./components/web-mobile'),
        },
        created() {
            this.initData();
        },
    });
}

export async function beforeClose() {}

export async function close() {}
