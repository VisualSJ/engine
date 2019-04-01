'use stirct';

const qrcode = require('qrcode');
const address = require('address');
const ipc = require('@base/electron-base-ipc');

exports.template = `
<style>
    .preview-server {
        display: flex;
        line-height: 18px;
        margin: 3px 5px;
    }

    .preview-server > div {
        position: relative;
        font-size: 13px;
        color: #22a257;
        margin-right: 5px;
    }

    .preview-server > div > svg {
        width: 12px;
    }

    .preview-server > div > div {
        position: absolute;
        background: white;
        z-index: 999;
        top: 30px;
        display: none;
        border-radius:var(--border-radius-n);
        flex-direction:column;
    }

    .preview-server > div > div[active] {
        display: flex;
    }

    .preview-server > div > div > canvas {
        width: 150px;
        height: 150px;
        margin:5px;
        margin-bottom:2px;
    }

    .preview-server .number {
        background: rgb(237, 112, 46);
        padding: 0 4px;
        color: #fff;
        border-radius: 4px;
    }
</style>
<div class="preview-server">
    <div>
        <span class="address"></span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="currentColor" d="M634.91 154.88C457.74-8.99 182.19-8.93 5.09 154.88c-6.66 6.16-6.79 16.59-.35 22.98l34.24 33.97c6.14 6.1 16.02 6.23 22.4.38 145.92-133.68 371.3-133.71 517.25 0 6.38 5.85 16.26 5.71 22.4-.38l34.24-33.97c6.43-6.39 6.3-16.82-.36-22.98zM320 352c-35.35 0-64 28.65-64 64s28.65 64 64 64 64-28.65 64-64-28.65-64-64-64zm202.67-83.59c-115.26-101.93-290.21-101.82-405.34 0-6.9 6.1-7.12 16.69-.57 23.15l34.44 33.99c6 5.92 15.66 6.32 22.05.8 83.95-72.57 209.74-72.41 293.49 0 6.39 5.52 16.05 5.13 22.05-.8l34.44-33.99c6.56-6.46 6.33-17.06-.56-23.15z"></path></svg>
        <div class="qr">
            <canvas class="canvas"></canvas>
            <span>扫一扫直接预览</span>
        </div>
    </div>
    <span class="number">0</span>
</div>
`;

exports.$ = {
    address: '.address',
    number: '.number',
    canvas: '.canvas',
    qr: '.qr',
};

exports.methods = {
    updateAddress() {
        this.$.address.innerHTML = this.address;
        qrcode.toCanvas(this.$.canvas, `http://${this.address}/`, {
            errorCorrectionLevel: 'H',
            maskPattern: 2,
            margin: 1,
        });
    },

    updateNumber() {
        this.$.number.innerHTML = this.number;
    },
};

exports.ready = async function() {
    this.number = 0;
    const port = await Editor.Ipc.requestToPackage('preview', 'get-port');
    this.address = `${address.ip()}:${port}`;
    this.updateAddress();
    this.updateNumber();

    this.$.address.addEventListener('mouseenter', () => {
        this.$.qr.setAttribute('active', '');
    });
    this.$.address.addEventListener('mouseleave', () => {
        this.$.qr.removeAttribute('active');
    });

    // 监听预览端口号变化
    ipc.on('preview:port-change', (event, port) => {
        this.address = `${address.ip()}:${port}`;
        this.updateAddress();
    });

    // 监听 preview 设备设立变化
    ipc.on('preview:device-num-change', (event, deviceNum) => {
        this.number = deviceNum;
        this.updateNumber();
    });
};
