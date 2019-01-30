'use stirct';

const dumpEncode = require('../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../dist/utils/dump/decode');

const typeMap = {
    boolean: 'Boolean',
    number: 'Number',
    [cc.GFXType.INT]: 'Number',
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
    [cc.GFXType.SAMPLER2D]: 'cc.Texture2D',
    [cc.GFXType.SAMPLER_CUBE]: 'cc.TextureCube',
};

function getDefaultValue(type) {
    switch (type) {
        case 'Boolean': return false;
        case 'Number': return 0;
        case 'cc.Vec2': return new cc.Vec2();
        case 'cc.Vec3': return new cc.Vec3();
        case 'cc.Vec4': return new cc.Vec4();
        case 'cc.Color': return new cc.Color();
        case 'cc.Mat4': return new cc.Mat4();
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

function encodeEffect(effect) {

    return effect.techniques.map((tech) => {
        return tech.passes.map((pass) => {

            const props = [];
            const defines = [];

            const prog = effect.shaders.find((s) => s.name === pass.program);

            prog.defines.forEach((define) => {
                const type = typeMap[define.type] || define.type;
                const value = getDefaultValue(type);
                defines.push({
                    name: define.name,
                    defines: define.defines,
                    type,
                    dump: dumpEncode.encodeObject(value, {
                        default: value,
                    }),
                });
            });

            pass.properties && Object.keys(pass.properties).forEach((name) => {
                const prop = pass.properties[name];
                const defs = getDefines(name, prog);
                const type = typeMap[prop.type] || prop.type;
                const value = getDefaultValue(type, prop.value);
                props.push({
                    name,
                    defines: defs,
                    type,
                    dump: dumpEncode.encodeObject(value, {
                        default: value,
                        displayName: prop.displayName,
                    }),
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
    material._effectAsset = cc.EffectAsset.get(dump.name);
    material._props = [];
    material._defines = [];
    material._techIdx = dump.technique;

    for (let i = 0; i < dump.data.length; i++) {
        const current = dump.data[i];
        material._props[i] = {};
        material._defines[i] = {};

        for (let j = 0; j < current.defines.length; j++) {
            const define = current.defines[j];

            const defaultValue = getDefaultValue(define.type);
            const defaultDump = dumpEncode.encodeObject(defaultValue, {
                default: defaultValue,
            });

            if (JSON.stringify(defaultDump.value) === JSON.stringify(define.dump.value)) {
                continue;
            }
            material._defines[i][define.name] = defaultValue;
            await dumpDecode.decodePatch(`${define.name}`, define.dump, material._defines[i]);
        }

        for (let j = 0; j < current.props.length; j++) {
            const prop = current.props[j];

            const defaultValue = getDefaultValue(prop.type);
            const defaultDump = dumpEncode.encodeObject(defaultValue, {
                default: defaultValue,
            });

            if (JSON.stringify(defaultDump.value) === JSON.stringify(prop.dump.value)) {
                continue;
            }
            material._props[i][prop.name] = defaultValue;
            await dumpDecode.decodePatch(`${prop.name}`, prop.dump, material._props[i]);
        }

    }

    return Manager.Utils.serialize(material);
}

exports.encodeEffect = encodeEffect;
exports.decodeMaterial = decodeMaterial;
