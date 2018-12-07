const address = require('address');

async function getPreviewUrl() {
    const port = await Editor.Ipc.requestToPackage('preview', 'get-port');
    return `http://${address.ip()}:${port}`;
}

module.exports = {
    getPreviewUrl,
};
