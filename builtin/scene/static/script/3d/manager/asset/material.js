'use stirct';

const dumpEncode = require('../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../dist/utils/dump/decode');

const typeMap = {
    boolean: 'Boolean',
    number: 'Number',
    string: 'String',

    [cc.GFXType.INT]: 'Number',
    [cc.GFXType.INT2]: 'cc.Vec2',
    [cc.GFXType.INT3]: 'cc.Vec3',
    [cc.GFXType.INT4]: 'cc.Vec4',

    [cc.GFXType.FLOAT]: 'Number',
    [cc.GFXType.FLOAT2]: 'cc.Vec2',
    [cc.GFXType.FLOAT3]: 'cc.Vec3',
    [cc.GFXType.FLOAT4]: 'cc.Vec4',

    [cc.GFXType.COLOR4]: 'cc.Color',
    [cc.GFXType.MAT4]: 'cc.Mat4',

    [cc.GFXType.SAMPLER2D]: 'cc.Asset',
    [cc.GFXType.SAMPLER_CUBE]: 'cc.Asset',
    [cc.GFXType.SAMPLER2D]: 'cc.Texture2D',
    [cc.GFXType.SAMPLER_CUBE]: 'cc.TextureCube',
};

function getDefaultValue(type, data) {
    switch (type) {
        case 'Boolean':
            if (data) {
                return data[0];
            }
            return false;
        case 'Number':
            if (data) {
                return data[0];
            }
            return 0;
        case 'cc.Vec2':
            if (data) {
                return new cc.Vec2(data[0] || 0, data[1] || 0);
            }
            return new cc.Vec2();
        case 'cc.Vec3':
            if (data) {
                return new cc.Vec2(data[0] || 0, data[1] || 0, data[2] || 0);
            }
            return new cc.Vec3();
        case 'cc.Vec4':
            if (data) {
                return new cc.Vec2(data[0] || 0, data[1] || 0, data[2] || 0, data[3] || 0);
            }
            return new cc.Vec4();
        case 'cc.Color':
            if (Array.isArray(data)) {
                if (data[3] === undefined) {
                    data[3] = 1;
                }
                return new cc.Color(data[0] * 255, data[1] * 255, data[2] * 255, data[3] * 255);
            }
            return new cc.Color();
        case 'cc.Mat4':
            if (Array.isArray(data)) {
                return new Mat4(
                    data[0],  data[1],  data[2],  data[3],
                    data[4],  data[5],  data[6],  data[7],
                    data[8],  data[9],  data[10], data[11],
                    data[12], data[13], data[14], data[15]
                );
            }
            return new cc.Mat4();
        case 'cc.Asset': return new cc.Asset();
        case 'cc.Texture2D': return new cc.Texture2D();
        case 'cc.TextureCube': return new cc.TextureCube();
    }
    return false;
}

const getDefines = (name, prog) => {
    const block = prog.blocks.find((b) => b.members.find((u) => u.name === name) !== undefined);
    if (block) { return block.defines; }
    const s = prog.samplers.find((u) => u.name === name);
    if (s) { return s.defines; }
};

/**
 * 传入一个 EffectAsset 对象，将其整理成一个二维数组
 * 第一层: technique
 * 第二层: pass
 * @param {*} effect
 */
function encodeEffect(effect) {

    return effect.techniques.map((tech) => {
        return tech.passes.map((pass) => {

            const props = [];
            const defines = [];

            const prog = effect.shaders.find((s) => s.name === pass.program);

            prog.defines.forEach((define) => {

                if (define.name.startsWith('CC_')) {
                    return;
                }

                const type = typeMap[define.type] || define.type;
                const value = getDefaultValue(type);
                const dump = dumpEncode.encodeObject(value, {
                    default: value,
                });
                defines.push({
                    name: define.name,
                    defines: define.defines,
                    type,
                    default: dump.value,
                    dump,
                });
            });

            pass.properties && Object.keys(pass.properties).forEach((name) => {
                const prop = pass.properties[name];
                const defs = getDefines(name, prog);
                const type = typeMap[prop.type] || prop.type;
                const value = getDefaultValue(type, prop.value);
                const dump = dumpEncode.encodeObject(value, {
                    default: value,
                    displayName: prop.displayName,
                });
                props.push({
                    name,
                    defines: defs,
                    type,
                    default: dump.value,
                    dump,
                });
            });

            return {
                props, defines,
            };
        });
    });
}

async function decodeMaterial(dump) {

    const material = new cc.Material();
    material._effectAsset = cc.EffectAsset.get(dump.effect);
    debugger;
    material._props = [];
    material._defines = [];
    material._techIdx = dump.technique;

    const technique = dump.data[dump.technique];

    for (let i = 0; i < technique.length; i++) {
        const current = technique[i];
        material._props[i] = {};
        material._defines[i] = {};

        for (let j = 0; j < current.defines.length; j++) {
            const define = current.defines[j];

            if (JSON.stringify(define.default) === JSON.stringify(define.dump.value)) {
                continue;
            }
            await dumpDecode.decodePatch(`${define.name}`, define.dump, material._defines[i]);
        }

        for (let j = 0; j < current.props.length; j++) {
            const prop = current.props[j];

            if (JSON.stringify(prop.default) === JSON.stringify(prop.dump.value)) {
                continue;
            }
            await dumpDecode.decodePatch(`${prop.name}`, prop.dump, material._props[i]);
        }

    }

    return Manager.Utils.serialize(material);
}

exports.encodeEffect = encodeEffect;
exports.decodeMaterial = decodeMaterial;
