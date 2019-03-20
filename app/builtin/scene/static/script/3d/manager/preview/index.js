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
            colorFmt: cc.GFXFormat.RGBA32F,
            depthStencilFmt: cc.GFXFormat.D24S8,
        });
        this.regions = [new cc.GFXBufferTextureCopy()];
        this.regions[0].texExtent.width = this.width;
        this.regions[0].texExtent.height = this.height;
        this.regions[0].texExtent.depth = 1;
        this.scene = null;
        Scene.on('open', this.patchSceneCameras.bind(this));
        Scene.on('reload', this.patchSceneCameras.bind(this));
    }

    patchSceneCameras(err, scene) {
        this.scene = scene.renderScene;
        const cameras = this.scene.cameras;
        for (const camera of cameras) {
            if (!cc.Layers.check(camera.node.layer, cc.Layers.All)) continue;
            camera.view.visibility = 1;
        }
    }

    queryCameraList() {
        const array = [];
        if (!this.scene) return array;
        const cameras = this.scene.cameras;
        for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];
            if (!cc.Layers.check(camera.node.layer, cc.Layers.All)) continue;
            array.push({
                index: i,
                name: camera._node.name,
                uuid: camera._node.uuid,
            });
        }
        return array;
    }

    resize(width, height, camera) {
        if (width === this.width && height === this.height) { return; }
        this.width = width;
        this.height = height;
        this.window.resize(width, height);
        camera.resize(width, height);
        this.data = Buffer.alloc(this.width * this.height * 4);
    }

    getImageData(cameraIndex, width, height) {
        if (!this.scene) return this.data;
        cameraIndex = parseInt(cameraIndex);
        if (isNaN(cameraIndex)) cameraIndex = 0;
        const camera = this.scene.cameras[cameraIndex];
        if (!camera) return this.data;
        this.resize(width, height, camera);
        cc.director.root.pipeline.render(camera.view);
        this.regions[0].texExtent.width = width;
        this.regions[0].texExtent.height = height;
        this.device.copyFramebufferToBuffer(this.window.framebuffer, this.data.buffer, this.regions);
        return this.data;
    }
}

module.exports = new Preview();

ipcRenderer.on('query-preview-data', (event, id, cameraIndex, width, height) => {
    const data = module.exports.getImageData(cameraIndex, width, height);
    ipcRenderer.sendTo(id, 'query-preview-data', data);
});
