'use strict';

const { ipcRenderer } = require('electron');

const NodeManager = require('../node');
const Scene = require('../scene');

let props = [
    '_lights',
    '_models',
    '_cameras',
];

class Preview {

    constructor() {

        this.width = 0;
        this.height = 0;
        this.rt = new cc.RenderTexture();
        this.rt.initWithSize(this.width, this.height, cc.gfx.RB_FMT_D24S8);
        this.data = new Buffer(this.width * this.height * 4);

        this.scene = new cc.renderer.Scene();
        NodeManager.on('changed', this.extractActualScene.bind(this));
        Scene.on('open', this.extractActualScene.bind(this));
    }

    extractActualScene() {
        const internal = cc.director._renderSystem._scene;
        const preview = this.scene;

        // sync with current scene
        props.forEach((p) => {
            const iList = internal[p];
            const pList = preview[p];
            pList.reset();
            for (let i = 0; i < iList.length; i++) {
                const data = iList.data[i];
                if (cc.Layers.check(data.getNode().layer, cc.Layers.All)) {
                    pList.push(data);
                }
            }
        });

        // override camera fbos
        let cams = preview._cameras;
        for (let i = 0; i < cams.length; i++) {
            let cam = cams.data[i];
            cam.setFramebuffer(this.rt._framebuffer);
        }
    }

    queryCameraList() {
        const array = [];
        const length = this.scene.getCameraCount();
        for (let i = 0; i < length; i++) {
            const camera = this.scene.getCamera(i);
            array.push({
                index: i,
                name: camera._node.name,
                uuid: camera._node.uuid,
            });
        }
        return array;
    }

    resize(width, height) {
        if (width === this.width && height === this.height) { return; }
        this.width = width;
        this.height = height;
        this.rt.updateSize(this.width, this.height);
        this.data = new Buffer(this.width * this.height * 4);
    }

    getImageData(cameraIndex, width, height) {
        const camera = this.scene.getCamera(cameraIndex);
        if (camera && this.scene.getDebugCamera() !== camera) {
            this.scene.setDebugCamera(camera);
        }
        this.resize(width, height);
        cc.game._renderer.render(this.scene);
        this.rt.readPixels(this.data);
        return this.data;
    }
}

module.exports = new Preview();

ipcRenderer.on('query-preview-data', (event, id, cameraIndex, width, height) => {
    const data = module.exports.getImageData(cameraIndex, width, height);
    ipcRenderer.sendTo(id, 'query-preview-data', data);
});
