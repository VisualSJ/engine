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
    // 更新当前构建进度
    'build:update-progress'(msg: string, rate: any, state: string) {
        vm.message = msg;
        vm.state = state ? state : '';
        if (rate) {
            vm.rate += rate;
        }
    },
    'asset-db:ready'() {
        !vm.isReady && vm.initData();
    },
    // *************** 监听资源变动，刷新面板内的场景数据 ********************//
    // 监听到资源添加
    async 'asset-db:asset-add'(uuid: string) {
        const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (asset.import === 'scene') {
            vm.scenes.push(asset);
        }
    },
    // 监听到资源修改（如重命名）
    async 'asset-db:asset-change'(uuid: string) {
        const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (asset.import === 'scene') {
            vm.scenes.push(asset);
        }
    },
    // 监听到资源删除
    'asset-db:asset-delete'(uuid: string) {
        vm.scenes.filter((item: any) => {
            return item.uuid !== uuid;
        });
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
            checkSuccess: true,
            state: '',
            message: '',
            rate: 0,
            data: {},
            isReady: false,
            nameTest: true,
            pathTest: true,
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
            needCompile(): boolean {
                // @ts-ignore
                return PlatformConfigs[this.setting.platform].isNative;
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

            showError(msg: string) {
                this.message = msg;
                this.state = 'error';
                this.rate = 0;
            },

            onChangeScene(event: any, index: any) {
                const value = !!event.target.value;
                this.scenes[index] && (this.scenes[index].choose = value);
            },

            // 检查数据后再更新数据
            onCheckChange(key: string, value: any) {
                const {platform} = this.setting;
                let checkSuccess = false;
                // TODO 更多构建平台加入后，需要更新完善该检测函数
                switch (key) {
                    case 'name':
                        const regex = /^[a-zA-Z0-9_-]*$/;
                        if (!regex.test(value)) {
                            this.showError(this.t('error.project_name_not_legal'));
                            this.nameTest = false;
                            return;
                        }
                        this.nameTest = true;
                        checkSuccess = true;
                        break;
                    case 'build_path':
                        const buildPath = join(Editor.Project.path, value);
                        const isNative = PlatformConfigs[platform].isNative;

                        if (process.platform === 'win32' && isNative && buildPath.length > MAX_BUILD_PATH_FOR_WIN32) {
                            this.showError(this.t('path_too_long_title'));
                            this.pathTest = false;
                            return;
                        }

                        if (buildPath.indexOf(' ') !== -1) {
                            this.showError(`${this.t('error.build_error')}, ${this.t('error.build_path_contains_space')}`);
                            this.pathTest = false;
                            return;
                        }

                        const containsChinese = /.*[\u4e00-\u9fa5]+.*$/.test(buildPath);
                        if (containsChinese) {
                            this.showError(`${this.t('error.build_error')},
                            ${this.t('error.build_path_contains_chinese')}`);
                            this.pathTest = false;
                            return;
                        }
                        this.pathTest = true;
                        checkSuccess = true;
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
                        checkSuccess = true;
                        break;
                    default:
                        checkSuccess = true;
                }
                if (checkSuccess) {
                    this.state = '';
                    this.message = '';
                    // 数据监测无误后，赋值存储
                    if (key in this.setting) {
                        value !== undefined && (this.setting[key] = value);
                        this.dataChanged('common', key, value);
                        this.updateData();
                    } else {
                        value !== undefined && (this[key] = value);
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
                const buildPath = join(Editor.Project.path, this.setting.build_path);
                ensureDirSync(buildPath);
                shell.openExternal(buildPath);
            },

            // 点击构建按钮
            onBuild(event: any) {
                event.target.state = 'loading';
                this._build();
            },

            // 构建项目
            async _build() {
                if (this.message && this.state) {
                    Editor.Dialog.show({
                        type: this.state,
                        message: this.message,
                        title: this.state,
                    });
                    return;
                }
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
