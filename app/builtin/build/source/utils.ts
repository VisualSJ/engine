const address = require('address');
const {join} = require('path');
async function getPreviewUrl() {
    const port = await Editor.Ipc.requestToPackage('preview', 'get-port');
    return `http://${address.ip()}:${port}`;
}

// 组件的混合基础对象
const mixinBase = {
    methods : {
        /**
         * 翻译
         * @param key
         */
        t(key: string) {
            const name = `build.${key}`;
            return Editor.I18n.t(name);
        },

        // 数据变化
        onConfirm(event: any) {
            const key = event.target.path;
            if (!key) {
                return;
            }
            // @ts-ignore
            this[key] = event.target.value;
            // @ts-ignore
            this.$emit('data-change', this.setting.platform, key, event.target.value);
        },
        // 数据初始化处理函数
        init() {

        },
        /**
         * 观察对象变化通知
         * @param {string} type
         */
        updateData(type: string) {

        },
    },
    props: [
        'setting',
        'data',
    ],
    watch : {
        setting: {
            deep: true,
            handler() {
               // @ts-ignore
                this.updateData('setting');
            },
        },
        data: {
            deep: true,
            handler() {
                // @ts-ignore
                this.updateData('data');
            },
        },
    },
    mounted() {
        // @ts-ignore
        this.init();
    },
};
module.exports = {
    getPreviewUrl,
    mixinBase,
};
