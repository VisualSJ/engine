'use stirct';

const ipc = require('@base/electron-base-ipc');

exports.template = `
<style>
.scene-gizmo-buttons {
    background: #616161;
    border-radius: 4px;
    overflow: hidden;
    font-size: 0;
}

.scene-gizmo-buttons > i {
    display: inline-block;
    width: 24px;
    height: 24px;
    line-height: 24px;
    cursor: pointer;
    font-size: 12px;
    user-select: none;
}

.scene-gizmo-buttons > i > svg {
    width: 12px;
    height: 12px;
    padding: 6px;
    display: inline-block;
}

.scene-gizmo-buttons > i[active] {
    background: #777;
}

.scene-gizmo-localtion {
    display: flex;
    margin-left: 10px;
    padding-right: 6px;
}

.scene-gizmo-localtion > i {
    display: flex;
    width: auto;
}

.scene-gizmo-localtion > i > span {
    width: 40px;
}

.camera-dimension {
    display: flex;
    margin-left: 10px;
}

</style>
<div class="scene-gizmo-buttons">
    <i class="position">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path fill="currentColor" d="M352.201 425.775l-79.196 79.196c-9.373 9.373-24.568 9.373-33.941 0l-79.196-79.196c-15.119-15.119-4.411-40.971 16.971-40.97h51.162L228 284H127.196v51.162c0 21.382-25.851 32.09-40.971 16.971L7.029 272.937c-9.373-9.373-9.373-24.569 0-33.941L86.225 159.8c15.119-15.119 40.971-4.411 40.971 16.971V228H228V127.196h-51.23c-21.382 0-32.09-25.851-16.971-40.971l79.196-79.196c9.373-9.373 24.568-9.373 33.941 0l79.196 79.196c15.119 15.119 4.411 40.971-16.971 40.971h-51.162V228h100.804v-51.162c0-21.382 25.851-32.09 40.97-16.971l79.196 79.196c9.373 9.373 9.373 24.569 0 33.941L425.773 352.2c-15.119 15.119-40.971 4.411-40.97-16.971V284H284v100.804h51.23c21.382 0 32.09 25.851 16.971 40.971z"></path>
        </svg>
    </i>
    <i class="rotation">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path fill="currentColor" d="M256.455 8c66.269.119 126.437 26.233 170.859 68.685l35.715-35.715C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.75c-30.864-28.899-70.801-44.907-113.23-45.273-92.398-.798-170.283 73.977-169.484 169.442C88.764 348.009 162.184 424 256 424c41.127 0 79.997-14.678 110.629-41.556 4.743-4.161 11.906-3.908 16.368.553l39.662 39.662c4.872 4.872 4.631 12.815-.482 17.433C378.202 479.813 319.926 504 256 504 119.034 504 8.001 392.967 8 256.002 7.999 119.193 119.646 7.755 256.455 8z"></path>
        </svg>
    </i>
    <i class="scale">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
            <path fill="currentColor" d="M448.1 344v112c0 13.3-10.7 24-24 24h-112c-21.4 0-32.1-25.9-17-41l36.2-36.2L224 295.6 116.8 402.9 153 439c15.1 15.1 4.4 41-17 41H24c-13.3 0-24-10.7-24-24V344c0-21.4 25.9-32.1 41-17l36.2 36.2L184.5 256 77.2 148.7 41 185c-15.1 15.1-41 4.4-41-17V56c0-13.3 10.7-24 24-24h112c21.4 0 32.1 25.9 17 41l-36.2 36.2L224 216.4l107.3-107.3L295.1 73c-15.1-15.1-4.4-41 17-41h112c13.3 0 24 10.7 24 24v112c0 21.4-25.9 32.1-41 17l-36.2-36.2L263.6 256l107.3 107.3 36.2-36.2c15.1-15.2 41-4.5 41 16.9z"></path>
        </svg>
    </i>
    <i class="rect">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
    <path fill="currentColor" d="M512 128V32c0-17.67-14.33-32-32-32h-96c-17.67 0-32 14.33-32 32H160c0-17.67-14.33-32-32-32H32C14.33 0 0 14.33 0 32v96c0 17.67 14.33 32 32 32v192c-17.67 0-32 14.33-32 32v96c0 17.67 14.33 32 32 32h96c17.67 0 32-14.33 32-32h192c0 17.67 14.33 32 32 32h96c17.67 0 32-14.33 32-32v-96c0-17.67-14.33-32-32-32V160c17.67 0 32-14.33 32-32zm-96-64h32v32h-32V64zM64 64h32v32H64V64zm32 384H64v-32h32v32zm352 0h-32v-32h32v32zm-32-96h-32c-17.67 0-32 14.33-32 32v32H160v-32c0-17.67-14.33-32-32-32H96V160h32c17.67 0 32-14.33 32-32V96h192v32c0 17.67 14.33 32 32 32h32v192z"/>
    </svg>
</i>
</div>

<div class="scene-gizmo-buttons scene-gizmo-localtion">
    <i class="pivot">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path fill="currentColor" d="M500 224h-30.364C455.724 130.325 381.675 56.276 288 42.364V12c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v30.364C130.325 56.276 56.276 130.325 42.364 224H12c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h30.364C56.276 381.675 130.325 455.724 224 469.636V500c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-30.364C381.675 455.724 455.724 381.675 469.636 288H500c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12zM288 404.634V364c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40.634C165.826 392.232 119.783 346.243 107.366 288H148c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-40.634C119.768 165.826 165.757 119.783 224 107.366V148c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12v-40.634C346.174 119.768 392.217 165.757 404.634 224H364c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40.634C392.232 346.174 346.243 392.217 288 404.634zM288 256c0 17.673-14.327 32-32 32s-32-14.327-32-32c0-17.673 14.327-32 32-32s32 14.327 32 32z"></path>
        </svg>
        <span>Pivot</span>
    </i>
    <i class="coordinate">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
            <path fill="currentColor" d="M248 8C111.03 8 0 119.03 0 256s111.03 248 248 248 248-111.03 248-248S384.97 8 248 8zm-11.34 240.23c-2.89 4.82-8.1 7.77-13.72 7.77h-.31c-4.24 0-8.31 1.69-11.31 4.69l-5.66 5.66c-3.12 3.12-3.12 8.19 0 11.31l5.66 5.66c3 3 4.69 7.07 4.69 11.31V304c0 8.84-7.16 16-16 16h-6.11c-6.06 0-11.6-3.42-14.31-8.85l-22.62-45.23c-2.44-4.88-8.95-5.94-12.81-2.08l-19.47 19.46c-3 3-7.07 4.69-11.31 4.69H50.81C49.12 277.55 48 266.92 48 256c0-110.28 89.72-200 200-200 21.51 0 42.2 3.51 61.63 9.82l-50.16 38.53c-5.11 3.41-4.63 11.06.86 13.81l10.83 5.41c5.42 2.71 8.84 8.25 8.84 14.31V216c0 4.42-3.58 8-8 8h-3.06c-3.03 0-5.8-1.71-7.15-4.42-1.56-3.12-5.96-3.29-7.76-.3l-17.37 28.95zM408 358.43c0 4.24-1.69 8.31-4.69 11.31l-9.57 9.57c-3 3-7.07 4.69-11.31 4.69h-15.16c-4.24 0-8.31-1.69-11.31-4.69l-13.01-13.01a26.767 26.767 0 0 0-25.42-7.04l-21.27 5.32c-1.27.32-2.57.48-3.88.48h-10.34c-4.24 0-8.31-1.69-11.31-4.69l-11.91-11.91a8.008 8.008 0 0 1-2.34-5.66v-10.2c0-3.27 1.99-6.21 5.03-7.43l39.34-15.74c1.98-.79 3.86-1.82 5.59-3.05l23.71-16.89a7.978 7.978 0 0 1 4.64-1.48h12.09c3.23 0 6.15 1.94 7.39 4.93l5.35 12.85a4 4 0 0 0 3.69 2.46h3.8c1.78 0 3.35-1.18 3.84-2.88l4.2-14.47c.5-1.71 2.06-2.88 3.84-2.88h6.06c2.21 0 4 1.79 4 4v12.93c0 2.12.84 4.16 2.34 5.66l11.91 11.91c3 3 4.69 7.07 4.69 11.31v24.6z"></path>
        </svg>
        <span>Local</span>
    </i>
</div>

<div class="scene-gizmo-buttons camera-dimension">
    <i class="dimension">
        <span>3D</span>
    </i>
</div>
`;

exports.$ = {
    position: '.position',
    rotation: '.rotation',
    scale: '.scale',
    rect: '.rect',

    pivot: '.pivot',
    coordinate: '.coordinate',
    dimension: '.dimension',
};

exports.methods = {
    /**
     * 更新 transform tool 名字
     * @param {*} toolName
     */
    updateGizmoTool(toolName) {
        ['position', 'rotation', 'scale', 'rect'].forEach((name) => {
            if (name === toolName) {
                this.$[name].setAttribute('active', '');
            } else {
                this.$[name].removeAttribute('active');
            }
        });
    },

    updateGizmoPivot(name) {
        this.pivot = name;
        this.$.pivot.getElementsByTagName('span')[0].innerHTML = name.replace(/^\S/, (str) => {
            return str.toUpperCase();
        });
    },

    updateGizmoCoordinate(name) {
        this.coordinate = name;
        this.$.coordinate.getElementsByTagName('span')[0].innerHTML = name.replace(/^\S/, (str) => {
            return str.toUpperCase();
        });
    },

    updateDimension(is2D) {
        this.dimension = is2D;
        let name = is2D ? '2D' : '3D';
        this.$.dimension.getElementsByTagName('span')[0].innerHTML = name.replace(/^\S/, (str) => {
            return str.toUpperCase();
        });
    },
};

exports.ready = async function() {
    this.pivot = 'center';
    this.coordinate = 'global';
    this.is2D = false;

    ipc.on(`scene:ready`, async (event) => {
        const toolName = await Editor.Ipc.requestToPanel('scene', 'query-gizmo-tool-name');
        this.updateGizmoTool(toolName);
        const pivot = await Editor.Ipc.requestToPanel('scene', 'query-gizmo-pivot');
        this.updateGizmoPivot(pivot);
        const coordinate = await Editor.Ipc.requestToPanel('scene', 'query-gizmo-coordinate');
        this.updateGizmoCoordinate(coordinate);
        const is2D = await Editor.Ipc.requestToPanel('scene', 'query-is2D');
        this.updateDimension(is2D);
    });

    ipc.on('scene:gizmo-tool-changed', (event, name) => {
        this.updateGizmoTool(name);
    });

    ipc.on('scene:gizmo-pivot-changed', (event, name) => {
        this.updateGizmoPivot(name);
    });

    ipc.on('scene:gizmo-coordinate-changed', (event, name) => {
        this.updateGizmoCoordinate(name);
    });

    ipc.on('scene:dimension-changed', (event, value) => {
        this.updateDimension(value);
    });

    ['position', 'rotation', 'scale', 'rect'].forEach((name) => {
        this.$[name].addEventListener('click', () => {
            Editor.Ipc.sendToPanel('scene', 'change-gizmo-tool', name);
        });
    });

    this.$.pivot.addEventListener('click', () => {
        if (this.pivot === 'pivot') {
            this.pivot = 'center';
        } else {
            this.pivot = 'pivot';
        }
        Editor.Ipc.sendToPanel('scene', 'change-gizmo-pivot', this.pivot);
    });

    this.$.coordinate.addEventListener('click', () => {
        if (this.coordinate === 'local') {
            this.coordinate = 'global';
        } else {
            this.coordinate = 'local';
        }
        Editor.Ipc.sendToPanel('scene', 'change-gizmo-coordinate', this.coordinate);
    });

    this.$.dimension.addEventListener('click', () => {
        if (this.is2D === true) {
            this.is2D = false;
        } else {
            this.is2D = true;
        }

        Editor.Ipc.sendToPanel('scene', 'change-is2D', this.is2D);
    });

    document.body.addEventListener('keydown', async (event) => {
        function getShadowRootActiveElement(element) {
            if (element && element.shadowRoot) {
                return getShadowRootActiveElement(element.shadowRoot.activeElement);
            }
            return element;
        }
        const element = getShadowRootActiveElement(document.activeElement);

        if (element && element.tagName === 'INPUT') {
            return;
        }

        if (event.ctrlKey || event.metaKey || event.alyKey || event.shiftKey) {
            switch (event.key) {
                case 'f':
                case 'F':
                    if (event.ctrlKey && event.shiftKey) {
                        const uuids = Editor.Selection.getSelected('node');
                        if (uuids && uuids.length) {
                            Editor.Ipc.sendToPanel('scene', 'copy-camera-data-to-nodes', uuids);
                        }
                    }
                    break;
            }

        } else {
            switch (event.key) {
                case 'w':
                case 'W':
                    Editor.Ipc.sendToPanel('scene', 'change-gizmo-tool', 'position');
                    break;
                case 'e':
                case 'E':
                    Editor.Ipc.sendToPanel('scene', 'change-gizmo-tool', 'rotation');
                    break;
                case 'r':
                case 'R':
                    Editor.Ipc.sendToPanel('scene', 'change-gizmo-tool', 'scale');
                    break;
                case 't':
                case 'T':
                    Editor.Ipc.sendToPanel('scene', 'change-gizmo-tool', 'rect');
                    break;
                case 'f':
                case 'F':
                    const uuids = Editor.Selection.getSelected('node');
                    if (uuids && uuids.length) {
                        Editor.Ipc.sendToPanel('scene', 'focus-camera', uuids);
                    }
            }
        }
    });
};
