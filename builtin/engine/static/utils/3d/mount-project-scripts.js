
const virtualModule = require('virtual-module');

function mount(scriptAssetInfos) {
    for (const scriptAssetInfo of scriptAssetInfos) {
        virtualModule.addAlias(scriptAssetInfo.source, (fromPath, request, alias) => {
            const result = scriptAssetInfo.library['.js'];
            // This may be caused by parsing error.
            if (result === undefined) {
                throw new Error(`Script parsing error, fix it first.`);
            }
            return result;
        });
    }
    for (const scriptAssetInfo of scriptAssetInfos) {
        require(scriptAssetInfo.source);
        console.info(`Script ${scriptAssetInfo.uuid}(${scriptAssetInfo.source}) mounted.`);
    }
}

function reset() {
    virtualModule.reset();
}

module.exports.mount = mount;
module.exports.reset = reset;
