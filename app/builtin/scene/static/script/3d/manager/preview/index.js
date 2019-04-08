'use strict';

const { ipcRenderer } = require('electron');
const Scene = require('../scene');

class Preview {

    constructor() {

        this.device = cc.director.root.device;
        this.width = this.device.width;
        this.height = this.device.height;
        this.data = Buffer.alloc(this.width * this.height * 4);

        this.window = cc.director.root.createWindow({
            title: 'Editor Game',
            width: this.width,
            height: this.height,
            colorFmt: this.device.colorFormat,
            depthStencilFmt: this.device.depthStencilFormat,
            isOffscreen: true,
        });
        this.regions = [new cc.GFXBufferTextureCopy()];
        this.regions[0].texExtent.width = this.width;
        this.regions[0].texExtent.height = this.height;
        this.regions[0].texExtent.depth = 1;
        this.scene = null;
        Scene.on('open', this.patchSceneCameras.bind(this));
        Scene.on('reload', this.patchSceneCameras.bind(this));
    }

    patchSceneCameras(scene) {
        this.scene = scene.renderScene;
        const cameras = this.scene.cameras;
        for (const camera of cameras) {
            if (!cc.Layers.check(camera.node.layer, cc.Layers.All)) continue;
            camera.view.visibility = 1;
        }
    }

    queryWindowList() {
        const array = [];
        if (!this.scene) return array;
        const windows = this.scene.root.windows;
        for (let i = 0; i < windows.length; i++) {
            const window = windows[i];
            array.push({ index: i, name: window._title });
        }
        return array;
    }

    resize(width, height, window) {
        this.width = width;
        this.height = height;
        this.regions[0].texExtent.width = width;
        this.regions[0].texExtent.height = height;
        window.resize(width, height);
        this.data = Buffer.alloc(this.width * this.height * 4);
    }

    getImageData(index, width, height) {
        if (!this.scene) return this.data;
        index = parseInt(index);
        if (isNaN(index)) index = 0;
        const root = this.scene.root;
        const window = root.windows[index];
        if (!window) return this.data;

        const needResize = width && height && (width !== this.width || height !== this.height);
        if (needResize) { this.resize(width, height, window); }

        for (const view of root.views) {
            if (view.isEnable && view.window === window) {
                if (needResize) { view.camera.resize(width, height); }
                root.pipeline.render(view);
            }
        }

        this.device.copyFramebufferToBuffer(window.framebuffer, this.data.buffer, this.regions);
        return this.data;
    }
}

module.exports = new Preview();

ipcRenderer.on('query-preview-data', (event, id, index, width, height) => {
    const data = module.exports.getImageData(index, width, height);
    ipcRenderer.sendTo(id, 'query-preview-data', data);
});
