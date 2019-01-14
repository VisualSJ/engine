'use stirct';

const dock = require('@editor/dock');
const ipc = require('@base/electron-base-ipc');

class Layout {

    /**
     * 应用布局
     * @param {*} layout
     */
    apply(layout) {
        ipc.broadcast('editor-lib-layout:apply', layout);
    }
}

module.exports = new Layout();
