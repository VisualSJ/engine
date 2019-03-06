'use stirct';

const Vue = require('vue/dist/vue');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const { join } = require('path');

new Vue({
    el: document.getElementById('toolbar'),

    components: {
        buttons: {
            props: ['file'],
            data() {
                return {
                    template: '',
                };
            },
            template: '<div ref="buttons"></div>',
            mounted() {
                try {
                    const mod = require(this.file);
                    this.$refs.buttons.innerHTML = mod.template;
                    const obj = { $: {} };

                    // 初始化 ¥
                    Object.keys(mod.$ || {}).forEach((key) => {
                        const name = mod.$[key];
                        if (name[0] === '.') {
                            obj.$[key] = this.$refs.buttons.getElementsByClassName(name.substr(1))[0];
                        } else if (key[0] === '#') {
                            obj.$[key] = document.getElementById(name.substr(1));
                        } else {
                            obj.$[key] = this.$refs.buttons.getElementsByTagName(name)[0];
                        }
                    });

                    // 初始化 methods
                    Object.keys(mod.methods || {}).forEach((name) => {
                        obj[name] = mod.methods[name];
                    });

                    mod.ready && mod.ready.call(obj);
                } catch (error) {
                    console.error(error);
                }
            },
        },
    },

    data: {
        left: [],
        middle: [],
        right: [],
    },

    mounted() {
        let list = Editor.Package.getPackages({
            autoEnable: true,
        });

        list.forEach((data) => {
            if (!data.info.toolbar) {
                return;
            }

            let toolbars = data.info.toolbar;

            if (!Array.isArray(toolbars)) {
                toolbars = [toolbars];
            }

            toolbars.forEach((toolbar) => {
                const array = this[toolbar.position];
                if (!array) {
                    return;
                }
                array.push(join(data.path, toolbar.file));
            });
        });
    },
});
