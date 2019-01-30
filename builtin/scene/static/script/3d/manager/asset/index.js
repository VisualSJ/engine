'use stirct';

const material = require('./material');

/**
 * 返回包含所有 Effect 的对象
 * @returns {{}}
 */
function queryAllEffects() {
    const effects = cc.EffectAsset.getAll();
    // get uuid from prototype chain
    Object.keys(effects).map((key) => {
        effects[key].uuid = effects[key]._uuid;
    });

    return effects;
}

/**
 * 根据 effectName 为 inspector 构建指定 Effect 数据
 * @param {string} effectName
 * @returns {{props: any[], defines: any[]}}
 */
function queryEffectDataForInspector(effectName) {
    const effect = cc.EffectAsset.get(effectName);
    if (!effect) {
        return {};
    }
    return material.encodeEffect(effect);
}

/**
 * 返回创建的 material 序列化数据
 *
 * todo 需要容错处理
 * @param {{effectName: string, _props: {}, _defines: {}}} options
 * @returns {string}
 */
function querySerializedMaterial(mtl) {
    return material.decodeMaterial(mtl);
}

module.exports = {
    queryAllEffects,
    queryEffectDataForInspector,
    querySerializedMaterial,
};
