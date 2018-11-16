'use stirct';

const Vue = require('vue/dist/vue');
const setting = require('@editor/setting');
const shell = require('electron').shell;
const ipc = require('@base/electron-base-ipc');
const address = require('address');
const qrcode = require('qrcode');

new Vue({

    el: document.getElementById('toolBar'),
    data: {
        path: {
            app: '',
            project: '',
        },
        ipAddress: '127.0.0.1',
        codeCanvas: null,
        deviceNumber: 0,
        platforms: 'browser'
    },
    mounted() {
        this.path.app = setting.PATH.APP;
        this.path.project = setting.PATH.PROJECT;
        this.ipAddress = address.ip() + ':7456';
        this.codeCanvas = document.getElementById('codeCanvas');
        this.createQRcode();
        // 监听预览端口号变化
        ipc.on('package-preview:port-change', (event, port) => {
            this.ipAddress = `${address.ip()}:${port}`;
            this.createQRcode();
        });
        // 监听 preview 设备设立变化
        ipc.on('package-preview:device-num-change', (event, deviceNum) => {
            this.deviceNumber = deviceNum;
        });
    },
    methods: {
        /**
         * 打开对应类型的文件路径
         * @param {*} type
         */
        openFolder(type) {
            shell.showItemInFolder(this.path[type]);
        },

        // 开始预览
        startPreview() {
            Editor.Ipc.sendToPackage('preview', 'open-terminal');
        },

        // 刷新预览
        refreshPreview() {
            Editor.Ipc.sendToPackage('preview', 'reload-terminal');
        },

        // 更改当前预览模式
        changePlatform(event) {
            this.platforms = event.target.value;
            ipc.send('package-preview:change-preview-platform', this.platforms);
        },

        // 生成预览二维码
        createQRcode() {
            if (!this.codeCanvas || !this.ipAddress) {
                return;
            }
            qrcode.toCanvas(this.codeCanvas, `http://${this.ipAddress}/`, {
                errorCorrectionLevel: 'H',
                maskPattern: 2,
                margin: 1
            });
        },
    }
});
