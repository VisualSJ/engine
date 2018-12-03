'use stirct';

/**
 * 返回包含所有内置 Effect 的对象
 * @returns {{}}
 */
function queryBuiltinEffects() {
    return cc.EffectAsset.getAll();
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
    const data = cc.Effect.parseForInspector(effect);
    return buildEffectData(data);
}

function buildEffectData(data = {}) {
    const typeMap = {
        Number: 'number',
        Boolean: 'boolean',
        Vec2: 'cc-vec2',
        Vec3: 'cc-vec3',
        Vec4: 'cc-vec4',
        Color: 'cc-color',
        Mat4: 'cc-mat4',
        Texture2D: 'cc-dragable',
        TextureCube: 'cc-dragable',
    };
    const assetMap = {
        Texture2D: 'cc.Texture2D',
        TextureCube: 'cc.TextureCube',
    };

    return Object.keys(data).reduce((acc, cur) => {
        const item = data[cur];
        acc[cur] = Object.keys(item).map((key) => {
            const info = item[key];
            const typeName = info.instanceType.name;
            const compType = typeMap[typeName];
            const type = assetMap[typeName];
            let {displayName: name, value} = info;

            if (compType === 'cc-dragable' && value === null) {
                value = {uuid: null};
            }

            if (compType === 'cc-color') {
                value = {
                    r: value.r,
                    g: value.g,
                    b: value.b,
                    a: value.a,
                };
            }

            return {value, key, compType, type, name, path: `_${cur}.${key}`};
        });

        return acc;
    }, {});

}

/**
 * 返回创建的 material 系列化数据
 * @param {{effectName: string, _props: {}, _defines: {}}} options
 * @returns {string}
 */
function querySerializedMaterial(options) {
    const {effectName, _props, _defines} = options;
    const material = new cc.Material();

    material.effectName = effectName;
    material._props = _props;
    material._defines = _defines;

    return Manager.serialize(material);
}

module.exports = {
    queryBuiltinEffects,
    queryEffectDataForInspector,
    querySerializedMaterial,
};
