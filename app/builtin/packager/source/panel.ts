'use strict';

import { existsSync, readFileSync } from 'fs';
import { ensureDirSync } from 'fs-extra';
import { join } from 'path';
const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    content: '.packager',
};

export const fonts = [{
    name: 'packager',
    file: 'packages://packager/static/font.woff',
}];

export const methods = {};

export const messages = {
    'packages:update'() {
        // 没有初始化的时候，无需处理
        if (!vm.ready) {
            return;
        }
        vm.refresh();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;
    vm = new Vue({
        el: panel.$.content,
        data: {
            ready: true,
            packages: [],
            packagesMap: [],
            tabs: [
                'internal',
                'project',
                'global',
            ],
            active: 'internal',
            search: '',
        },
        mounted() {
            this.refresh();
        },
        components: {
            'pkg-node': require('./components/pkg-node'),
        },
        methods: {
            /**
             * 翻译
             * @param {*} key
             */
            t(key: string): string {
                // @ts-ignore
                return Editor.I18n.t(`packager.menu.${key}`);
            },
            refresh() {
                // @ts-ignore
                const packages = Editor.remote.Package.getPackages();

                // @ts-ignore
                this.packages = packages.map((pkg: IonePackage) => {
                    let type = '';
                    if (pkg.path.startsWith(Editor.App.path)) {
                        type = 'internal';
                    } else if (pkg.path.startsWith(Editor.App.project)) {
                        type = 'project';
                    } else if (pkg.path.startsWith(Editor.App.home)) {
                        type = 'global';
                    }

                    if (!type) {
                        return;
                    }

                    pkg.type = type;

                    return Object.assign({}, pkg); // hack: vue 界面才会变化
                }).filter(Boolean);

                this.doSearch();
            },
            doSearch() {
                // @ts-ignore
                this.search = this.$refs.search.value;
                // @ts-ignore
                if (this.search) {
                    // @ts-ignore
                    this.packagesMap = this.packages.filter((pkg: IonePackage) => pkg.info.name.search(this.search) !== -1);
                } else {
                    // @ts-ignore
                    this.packagesMap = this.packages;
                }
            },
            async addPackage() {
                // @ts-ignore
                const isSuccess = await Editor.Ipc.requestToPackage('packager', 'add-package', this.active);
                if (isSuccess) {
                    Editor.Dialog.show({
                        title: vm.t('add'),
                        type: 'info',
                        message: vm.t('addSuccess'),
                        buttons: [],
                    });
                }
            },
            async importPackage() {
                // @ts-ignore
                const isSuccess = await Editor.Ipc.requestToPackage('packager', 'import-package', this.active);
                if (isSuccess) {
                    Editor.Dialog.show({
                        title: vm.t('import'),
                        type: 'info',
                        message: vm.t('importSuccess'),
                        buttons: [],
                    });
                }
            },
            installPackage() {
                // @ts-ignore
            },
        },
    });
}

export async function beforeClose() { }

export async function close() { }
