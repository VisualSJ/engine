'use strict';

const { join } = require('path');
const { readdirSync, existsSync } = require('fs');

const tester = require('../tester');
const profile = Editor.Profile.load('profile://local/tester.json');

exports.data = function() {
    return {
        language: '',

        auto: !!profile.get('auto'),
        running: false,

        package: '',
        path: '',
        test: '',

        packages: [],
        tests: [],

        logs: [],
    };
};

exports.watch = {
    package(name) {
        this.packages.some((item) => {
            if (item.name === name) {
                this.path = item.path;
                return true;
            }
        });
        if (!this.path) {
            this.test = '';
            return this.tests = [];
        }

        const dir = join(this.path, 'test');
        if (!existsSync(dir)) {
            this.test = '';
            return this.tests = [];
        }

        const list = readdirSync(dir);
        this.tests = list.filter((name) => {
            return /\.js$/.test(name);
        });
        this.test = this.tests[0];
    },
};

exports.methods = {

    /**
     * 翻译文本
     */
    t(key, language) {
        return Editor.I18n.t(`tester.${key}`);
    },

    /**
     * 切换自动测试状态
     */
    _onAutoClick(event) {
        this.auto = !this.auto;
        profile.set('auto', this.auto);
        profile.save();
    },

    /**
     * 切换测试插件
     */
    _onPakcageConfirm(event) {
        const name = event.target.value;
        this.package = name;
        profile.set('package', name);
        profile.save();
    },

    /**
     * 切换测试脚本
     */
    _onTestConfirm(event) {
        this.test = event.target.value;
    },

    /**
     * 点击测试按钮
     */
    async _onTestButtonClick(event) {
        if (!this.package || !this.test || this.running) {
            return;
        }
        this.running = true;
        this.logs = [];

        const list = [];

        if (this.auto) {
            this.tests.forEach((name) => {
                list.push(name);
            });
        } else {
            list.push(this.test);
        }

        for (let i = 0; i < list.length; i++) {
            const test = list[i];
            this.logs.push({
                type: 'info',
                message: `======== ${test} ========`,
            });
            const script = join(this.path, 'test', test);
            try {
                require(script);
                await tester.run();
            } catch (error) {
                console.error(error);
            }
            delete require.cache[script];
        }
        this.running = false;
    },
},
exports.mounted = async function() {
    this.packages = Editor.Package.getPackages();
    this.package = profile.get('package');

    tester.on('print', (item) => {
        this.logs.push(item);
    });
};
