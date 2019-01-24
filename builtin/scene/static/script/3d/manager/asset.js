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
    return buildEffectData(effect);
}

const { Vec2, Vec3, Vec4, Mat4, Color } = cc;
const _ctorMap = {
    ['boolean']: (v) => v || false,
    ['number']: (v) => v || 0,
    ['cc.Vec2']: (v) => Array.isArray(v) ? new Vec2(v[0], v[1]) : new Vec2(),
    ['cc.Vec3']: (v) => Array.isArray(v) ? new Vec3(v[0], v[1], v[2]) : new Vec3(),
    ['cc.Vec4']: (v) => Array.isArray(v) ? new Vec4(v[0], v[1], v[2], v[3]) : new Vec4(),
    ['cc.Color']: (v) => Array.isArray(v) ? new Color(v[0] * 255, v[1] * 255, v[2] * 255,
        (v[3] || 1) * 255) : new Color(),
    ['cc.Mat4']: (v) => Array.isArray(v) ? new Mat4(
            v[0],  v[1],  v[2],  v[3],
            v[4],  v[5],  v[6],  v[7],
            v[8],  v[9],  v[10], v[11],
            v[12], v[13], v[14], v[15]
        ) : new Mat4(),
    ['cc.Asset']: (v) => { uuid: v || null; },
};
const getValue = (type, value) => _ctorMap[type](value);

const buildEffectData = (function() {
    const _typeMap = {
        [cc.GFXType.SAMPLER2D]: 'cc.Texture2D',
        [cc.GFXType.SAMPLER_CUBE]: 'cc.TextureCube',
    };
    const _compTypeMap = {
        [cc.GFXType.INT]: 'number',
        [cc.GFXType.INT2]: 'cc.Vec2',
        [cc.GFXType.INT3]: 'cc.Vec3',
        [cc.GFXType.INT4]: 'cc.Vec4',
        [cc.GFXType.FLOAT]: 'number',
        [cc.GFXType.FLOAT2]: 'cc.Vec2',
        [cc.GFXType.FLOAT3]: 'cc.Vec3',
        [cc.GFXType.FLOAT4]: 'cc.Vec4',
        [cc.GFXType.COLOR4]: 'cc.Color',
        [cc.GFXType.MAT4]: 'cc.Mat4',
        [cc.GFXType.SAMPLER2D]: 'cc.Asset',
        [cc.GFXType.SAMPLER_CUBE]: 'cc.Asset',
    };
    const getCompType = (type) => _compTypeMap[type];
    const getType = (type) => _typeMap[type];
    const getValueFromGFXType = (type, value) => getValue(_compTypeMap[type] || type, value);
    const getDefines = (name, prog) => {
        const block = prog.blocks.find((b) => b.members.find((u) => u.name === name) !== undefined);
        if (block) { return block.defines; }
        const s = prog.samplers.find((u) => u.name === name);
        if (s) { return s.defines; }
    };
    return function(effect) {
        const techs = [];
        for (const tech of effect.techniques) {
            const passes = [];
            techs.push(passes);
            for (const pass of tech.passes) {
                const props = [], defines = [];
                passes.push({ props, defines });
                const prog = effect.shaders.find((s) => s.name === pass.program);
                prog.defines.forEach((define) => {
                    defines.push({
                        value: getValueFromGFXType(define.type),
                        key: define.name,
                        compType: getCompType(define.type),
                        type: getType(define.type),
                        defines: define.defines,
                        path: `_defines.${define.name}`,
                    });
                });
                if (!pass.properties) { continue; }
                for (const p of Object.keys(pass.properties)) {
                    const prop = pass.properties[p];
                    const defs = getDefines(p, prog);
                    props.push({
                        value: getValueFromGFXType(prop.type, prop.value),
                        key: p,
                        compType: getCompType(prop.type),
                        type: getType(prop.type),
                        defines: defs,
                        name: prop.displayName,
                        path: `_props.${p}`,
                    });
                }
            }
        }
        return techs;
    };
})();

/**
 * 返回创建的 material 序列化数据
 *
 * todo 需要容错处理
 * @param {{effectName: string, _props: {}, _defines: {}}} options
 * @returns {string}
 */
const querySerializedMaterial = (function() {
    const find = (map, type, name) => {
        return map[type].find((e) => e.key === name);
    };
    return function(options) {
        const { effectName, _props, _defines, effectMap, _techIdx } = options;

        const props = _props.map((prop, index) => {
            const map = effectMap[_techIdx][index];
            const data = {};

            for (const name of Object.keys(prop)) {
                const info = find(map, 'props', name);
                data[name] = getValue(info.compType, info.value);
                if (data[name] === null) {
                    delete data[name];
                }
            }
            return data;
        });

        const defines = _defines.map((define, index) => {
            const map = effectMap[_techIdx][index];
            const data = {};

            for (const name of Object.keys(define)) {
                const info = find(map, 'defines', name);
                data[name] = getValue(info.compType, info);
                if (data[name] === false) {
                    delete data[name];
                }
            }
            return data;
        });

        const material = new cc.Material();
        material._effectAsset = cc.EffectAsset.get(effectName);
        material._props = props;
        material._defines = defines;
        material._techIdx = _techIdx;

        return Manager.Utils.serialize(material);
    };
})();

module.exports = {
    queryAllEffects,
    queryEffectDataForInspector,
    querySerializedMaterial,
};
