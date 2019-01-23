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
</div>
`;

exports.$ = {
    position: '.position',
    rotation: '.rotation',
    scale: '.scale',
};

exports.methods = {
    updateActive(toolName) {
        Object.keys(this.$).forEach((name) => {
            if (name === toolName) {
                this.$[name].setAttribute('active', '');
            } else {
                this.$[name].removeAttribute('active');
            }
        });
    },
};

exports.ready = async function() {
    ipc.on(`scene:ready`, async (event) => {
        const toolName = await Editor.Ipc.requestToPanel('scene', 'query-gizmo-tool-name');
        this.updateActive(toolName);
    });

    ipc.on('scene:gizmo-tool-changed', (event, name) => {
        this.updateActive(name);
    });

    ['position', 'rotation', 'scale'].forEach((name) => {
        this.$[name].addEventListener('click', () => {
            Editor.Ipc.sendToPanel('scene', 'change-gizmo-tool', name);
        });
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
            case 'f':
            case 'F':
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'node');
                if (uuids && uuids.length) {
                    Editor.Ipc.sendToPanel('scene', 'focus-camera', uuids);
                }
        }
    });
};
