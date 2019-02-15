
const virtualModule = require('virtual-module');

function mount(scriptAssetInfos) {
    for (const scriptAssetInfo of scriptAssetInfos) {
        virtualModule.addAlias(scriptAssetInfo.source, (fromPath, request, alias) => {
            return scriptAssetInfo.library['.js'];
        });
    }
    for (const scriptAssetInfo of scriptAssetInfos) {
        require(scriptAssetInfo.source);
        console.log(`Script ${scriptAssetInfo.uuid}(${scriptAssetInfo.source}) mounted.`);
    }
}

module.exports.mount = mount;
