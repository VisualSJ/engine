'use stirct';

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
    const data = cc.Effect.parseForInspector(effect);
    return buildEffectData(data);
}

let buildEffectData = (function() {
    const { Vec2, Vec3, Vec4, Color, Mat4 } = cc;
    const { Texture2D, TextureCube } = cc.gfx;
    const typeMap = {
        [Number]: 'number',
        [Boolean]: 'boolean',
        [Vec2]: 'cc-vec2',
        [Vec3]: 'cc-vec3',
        [Vec4]: 'cc-vec4',
        [Color]: 'cc-color',
        [Mat4]: 'cc-mat4',
        [Texture2D]: 'cc-dragable',
        [TextureCube]: 'cc-dragable',
    };
    const assetMap = {
        [Texture2D]: 'cc.Texture2D',
        [TextureCube]: 'cc.TextureCube',
    };
    return function(data = {}) {
        return Object.keys(data).reduce((acc, cur) => {
            const item = data[cur];
            acc[cur] = Object.keys(item).map((key) => {
                const info = item[key];
                const typeName = info.instanceType;
                const compType = typeMap[typeName];
                const type = assetMap[typeName];
                let { displayName, value, defines } = info;

                if (compType === 'cc-dragable' && value === null) {
                    value = { uuid: null };
                }

                if (compType === 'cc-color') {
                    value = {
                        r: value.r,
                        g: value.g,
                        b: value.b,
                        a: value.a,
                    };
                }

                return { value, key, compType, type, defines, name: displayName, path: `_${cur}.${key}` };
            });

            return acc;
        }, {});
    };
})();

/**
 * 返回创建的 material 系列化数据
 * @param {{effectName: string, _props: {}, _defines: {}}} options
 * @returns {string}
 */
let querySerializedMaterial = (function() {
    let find = (effectMap, type, name) => effectMap[type].find((e) => e.key === name);
    let typeMap = {
        number: (v) => v.value || 0,
        boolean: (v) => v.value || false,
        'cc-vec2': (v) => cc.v2(v.value),
        'cc-vec3': (v) => cc.v3(v.value),
        'cc-vec4': (v) => cc.v4(v.value),
        'cc-color': (v) => cc.color(v.value),
        'cc-mat4': (v) => cc.mat4(v.value),
        'cc-dragable': (v) => {
            let res = null;
            switch (v.type) {
                case 'cc.Texture2D':
                    res = new cc.Texture2D();
                case 'cc.TextureCube':
                    res = new cc.TextureCube();
            }
            res._uuid = v.value && v.value.uuid;
            return res;
        },
    };
    return function(options) {
        const { effectName, _props, _defines, effectMap } = options;
        let props = {};
        let defines = {};
        for (let name in _props) {
            if (true) {
                let info = find(effectMap, 'props', name);
                props[name] = typeMap[info.compType](info);
                if (props[name] === null) {
                    delete props[name];
                }
            }
        }
        for (let name in _defines) {
            if (true) {
                let info = find(effectMap, 'defines', name);
                defines[name] = typeMap[info.compType](info);
                if (defines[name] === false) {
                    delete defines[name];
                }
            }
        }

        const material = new cc.Material();
        material._effectAsset = cc.EffectAsset.get(effectName);
        material._props = props;
        material._defines = defines;

        return Manager.Utils.serialize(material);
    };
})();

module.exports = {
    queryAllEffects,
    queryEffectDataForInspector,
    querySerializedMaterial,
};
